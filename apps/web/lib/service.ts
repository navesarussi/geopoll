import { DEMO_POLL, currentEpoch, optionIds } from "./poll";
import { blackoutFor, config, getPoll, polls } from "./config";
import { nullifier, tokenEpoch, verifyToken } from "./crypto";
import { blackoutResults, toPublic, type PublicResults } from "./results";
import type { BallotStore } from "./store";

export type VoteOutcome =
  | { ok: true; status: "created" | "replaced" }
  | { ok: false; error: "bad_request" | "bad_token" | "wrong_epoch" | "bad_option" | "unknown_poll" | "blackout" };

const pub = () => config().jurisdiction.publication;

/** Zone B: accepts a ballot with NO identity input. Enqueued; counted at next batch flush. */
export async function castVote(
  ballots: BallotStore,
  input: { pollId: string; option: string; preparedMsg: Uint8Array; signature: Uint8Array },
  now = new Date(),
): Promise<VoteOutcome> {
  const poll = getPoll(input.pollId);
  if (!poll) return { ok: false, error: "unknown_poll" };
  if (!poll.options.some((o) => o.id === input.option)) return { ok: false, error: "bad_option" };
  // ADR-0004: voting on election polls is frozen during the §16ה(ח) window (when configured).
  if (config().jurisdiction.blackout.freezeVoting && blackoutFor(poll, now).active) return { ok: false, error: "blackout" };
  const tier = await verifyToken(input.preparedMsg, input.signature);
  if (!tier) return { ok: false, error: "bad_token" };
  if (tokenEpoch(input.preparedMsg) !== currentEpoch(now)) return { ok: false, error: "wrong_epoch" };
  const status = await ballots.enqueue(input.pollId, nullifier(input.preparedMsg, input.pollId), input.option, currentEpoch(now), tier);
  return { ok: true, status };
}

/** Batch ingestion: flush the queue when older than BATCH_INTERVAL_SECONDS (default 1h, ADR-0020). */
export async function maybeFlush(ballots: BallotStore, now = new Date()) {
  const last = await ballots.lastFlush();
  if (!last || now.getTime() - last.getTime() >= pub().batchIntervalSeconds * 1000) await ballots.flush(now);
}

/** Batch publication: snapshot recomputed only after SNAPSHOT_INTERVAL_SECONDS (default daily). */
/**
 * BATCH_MODE=scheduled: flush/snapshot happen ONLY in runBatch() (worker or cron), never on user requests,
 * so request timing can't influence batch boundaries. Default "request" keeps the serverless demo working.
 */
export const scheduledMode = () => process.env.BATCH_MODE === "scheduled";

export async function runBatch(ballots: BallotStore, now = new Date()) {
  const flushed = await ballots.flush(now);
  let snapshotAt = now.toISOString();
  for (const p of polls()) {
    // During blackout no new snapshot is computed for affected polls (nothing new can be published).
    if (blackoutFor(p, now).active) continue;
    const snap = toPublic(await ballots.tally(p.id), optionIds(p.id), now, await ballots.tiers(p.id));
    await ballots.saveSnapshot(p.id, snap);
    snapshotAt = snap.snapshotAt;
  }
  return { flushed, snapshotAt };
}

export async function results(ballots: BallotStore, now = new Date(), pollId: string = DEMO_POLL.id): Promise<PublicResults> {
  const poll = getPoll(pollId);
  if (!poll) throw new Error("unknown_poll");
  // ADR-0004 / §16ה(ח): publication suppressed while the configured blackout window is active.
  if (blackoutFor(poll, now).active) return blackoutResults(now);
  const OPTION_IDS = optionIds(pollId);
  if (scheduledMode()) {
    return (await ballots.getSnapshot(pollId)) ?? toPublic({}, OPTION_IDS, now);
  }
  await maybeFlush(ballots, now);
  const snap = await ballots.getSnapshot(pollId);
  if (snap && now.getTime() - Date.parse(snap.snapshotAt) < pub().snapshotIntervalSeconds * 1000) return snap;
  const fresh = toPublic(await ballots.tally(pollId), OPTION_IDS, now, await ballots.tiers(pollId));
  await ballots.saveSnapshot(pollId, fresh);
  return fresh;
}

/** Dummy data (clearly fake): N ballots with "seed-" nullifiers, deterministic distribution. */
export async function seedDummy(ballots: BallotStore, n: number, pollId: string = DEMO_POLL.id) {
  const OPTION_IDS = optionIds(pollId);
  // Deterministic, decreasing weights (dummy only).
  const raw = OPTION_IDS.map((_, i) => 1 / (i + 1.5)); const sum = raw.reduce((a, b) => a + b, 0);
  const weights = raw.map((w) => w / sum);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = ((i * 2654435761) % 1000) / 1000;
    let acc = 0, opt = OPTION_IDS[OPTION_IDS.length - 1];
    for (let j = 0; j < weights.length; j++) { acc += weights[j]; if (x < acc) { opt = OPTION_IDS[j]; break; } }
    items.push({ nullifier: `seed-${pollId}-${i}`, option: opt, epoch: currentEpoch() });
  }
  await ballots.seed(pollId, items);
}
