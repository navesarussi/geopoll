import { DEMO_POLL, OPTION_IDS, currentEpoch } from "./poll";
import { nullifier, tokenEpoch, verifyToken } from "./crypto";
import { toPublic, type PublicResults } from "./results";
import type { BallotStore } from "./store";

export type VoteOutcome =
  | { ok: true; status: "created" | "replaced" }
  | { ok: false; error: "bad_request" | "bad_token" | "wrong_epoch" | "bad_option" | "unknown_poll" };

/** Zone B: accepts a ballot with NO identity input whatsoever. */
export async function castVote(
  ballots: BallotStore,
  input: { pollId: string; option: string; preparedMsg: Uint8Array; signature: Uint8Array },
  now = new Date(),
): Promise<VoteOutcome> {
  if (input.pollId !== DEMO_POLL.id) return { ok: false, error: "unknown_poll" };
  if (!OPTION_IDS.includes(input.option)) return { ok: false, error: "bad_option" };
  if (!(await verifyToken(input.preparedMsg, input.signature))) return { ok: false, error: "bad_token" };
  if (tokenEpoch(input.preparedMsg) !== currentEpoch(now)) return { ok: false, error: "wrong_epoch" };
  const status = await ballots.upsert(input.pollId, nullifier(input.preparedMsg, input.pollId), input.option, currentEpoch(now));
  return { ok: true, status };
}

/** Batched publication: recompute only when the snapshot is older than the interval. */
export async function results(ballots: BallotStore, now = new Date()): Promise<PublicResults> {
  const intervalSec = Number(process.env.SNAPSHOT_INTERVAL_SECONDS ?? 86400);
  const snap = await ballots.getSnapshot(DEMO_POLL.id);
  if (snap && now.getTime() - Date.parse(snap.snapshotAt) < intervalSec * 1000) return snap;
  const fresh = toPublic(await ballots.tally(DEMO_POLL.id), OPTION_IDS, now);
  await ballots.saveSnapshot(DEMO_POLL.id, fresh);
  return fresh;
}

/** Dummy data (clearly fake): N ballots with "seed-" nullifiers, deterministic distribution. */
export async function seedDummy(ballots: BallotStore, n: number) {
  const weights = [0.46, 0.31, 0.15, 0.08];
  for (let i = 0; i < n; i++) {
    const x = ((i * 2654435761) % 1000) / 1000;
    let acc = 0, opt = OPTION_IDS[OPTION_IDS.length - 1];
    for (let j = 0; j < weights.length; j++) { acc += weights[j]; if (x < acc) { opt = OPTION_IDS[j]; break; } }
    await ballots.upsert(DEMO_POLL.id, `seed-${i}`, opt, currentEpoch());
  }
}
