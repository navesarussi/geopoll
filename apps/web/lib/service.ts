import { DEMO_POLL, OPTION_IDS, currentEpoch } from "./poll";
import { nullifier, tokenEpoch, verifyToken } from "./crypto";
import { toPublic, type PublicResults } from "./results";
import type { BallotStore } from "./store";

export type VoteOutcome =
  | { ok: true; status: "created" | "replaced" }
  | { ok: false; error: "bad_request" | "bad_token" | "wrong_epoch" | "bad_option" | "unknown_poll" };

const secs = (name: string, dflt: number) => Number(process.env[name] ?? dflt) * 1000;

/** Zone B: accepts a ballot with NO identity input. Enqueued; counted at next batch flush. */
export async function castVote(
  ballots: BallotStore,
  input: { pollId: string; option: string; preparedMsg: Uint8Array; signature: Uint8Array },
  now = new Date(),
): Promise<VoteOutcome> {
  if (input.pollId !== DEMO_POLL.id) return { ok: false, error: "unknown_poll" };
  if (!OPTION_IDS.includes(input.option)) return { ok: false, error: "bad_option" };
  const tier = await verifyToken(input.preparedMsg, input.signature);
  if (!tier) return { ok: false, error: "bad_token" };
  if (tokenEpoch(input.preparedMsg) !== currentEpoch(now)) return { ok: false, error: "wrong_epoch" };
  const status = await ballots.enqueue(input.pollId, nullifier(input.preparedMsg, input.pollId), input.option, currentEpoch(now), tier);
  return { ok: true, status };
}

/** Batch ingestion: flush the queue when older than BATCH_INTERVAL_SECONDS (default 1h, ADR-0020). */
export async function maybeFlush(ballots: BallotStore, now = new Date()) {
  const last = await ballots.lastFlush();
  if (!last || now.getTime() - last.getTime() >= secs("BATCH_INTERVAL_SECONDS", 3600)) await ballots.flush(now);
}

/** Batch publication: snapshot recomputed only after SNAPSHOT_INTERVAL_SECONDS (default daily). */
/**
 * BATCH_MODE=scheduled: flush/snapshot happen ONLY in runBatch() (worker or cron), never on user requests,
 * so request timing can't influence batch boundaries. Default "request" keeps the serverless demo working.
 */
export const scheduledMode = () => process.env.BATCH_MODE === "scheduled";

export async function runBatch(ballots: BallotStore, now = new Date()) {
  const flushed = await ballots.flush(now);
  const snap = toPublic(await ballots.tally(DEMO_POLL.id), OPTION_IDS, now, await ballots.tiers(DEMO_POLL.id));
  await ballots.saveSnapshot(DEMO_POLL.id, snap);
  return { flushed, snapshotAt: snap.snapshotAt };
}

export async function results(ballots: BallotStore, now = new Date()): Promise<PublicResults> {
  if (scheduledMode()) {
    return (await ballots.getSnapshot(DEMO_POLL.id)) ?? toPublic({}, OPTION_IDS, now);
  }
  await maybeFlush(ballots, now);
  const snap = await ballots.getSnapshot(DEMO_POLL.id);
  if (snap && now.getTime() - Date.parse(snap.snapshotAt) < secs("SNAPSHOT_INTERVAL_SECONDS", 86400)) return snap;
  const fresh = toPublic(await ballots.tally(DEMO_POLL.id), OPTION_IDS, now, await ballots.tiers(DEMO_POLL.id));
  await ballots.saveSnapshot(DEMO_POLL.id, fresh);
  return fresh;
}

/** Dummy data (clearly fake): N ballots with "seed-" nullifiers, deterministic distribution. */
export async function seedDummy(ballots: BallotStore, n: number) {
  const weights = [0.46, 0.31, 0.15, 0.08];
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = ((i * 2654435761) % 1000) / 1000;
    let acc = 0, opt = OPTION_IDS[OPTION_IDS.length - 1];
    for (let j = 0; j < weights.length; j++) { acc += weights[j]; if (x < acc) { opt = OPTION_IDS[j]; break; } }
    items.push({ nullifier: `seed-${i}`, option: opt, epoch: currentEpoch() });
  }
  await ballots.seed(DEMO_POLL.id, items);
}
