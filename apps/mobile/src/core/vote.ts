/**
 * Secret ballot submission + offline queue. Ballots go to the RELAY with auth:false (no bearer, no cookies),
 * so Zone B never sees who sent them. When offline, the ballot (incl. token) is stored in the secure KV and
 * retried later; only the LAST queued choice per poll is kept (revote semantics, ADR-0020).
 */
import type { Http, KV, Token } from "./types";

export const QUEUE_KEY = "gp.queue.v1";
export const CHOICE_KEY = (pollId: string) => `gp.choice.${pollId}`;
export type Ballot = { pollId: string; option: string; preparedMsg: string; signature: string; queuedAt: string };
export type VoteOutcome =
  | { kind: "created" | "replaced" }
  | { kind: "queued" }
  | { kind: "error"; code: string; dropToken: boolean };

const isNetworkError = (e: unknown) => e instanceof TypeError || (e as { name?: string })?.name === "NetworkError";

export async function sendBallot(http: Http, relayPath: string, b: Ballot): Promise<VoteOutcome> {
  const r = await http(`${relayPath}/vote`, { method: "POST", auth: false, body: { pollId: b.pollId, option: b.option, preparedMsg: b.preparedMsg, signature: b.signature } });
  const j = (r.json ?? {}) as { ok?: boolean; status?: string; error?: string };
  if (r.status >= 500) throw new TypeError("server_unavailable"); // transient → keep queued
  if (j.ok) return { kind: j.status === "replaced" ? "replaced" : "created" };
  const code = j.error ?? "vote_failed";
  return { kind: "error", code, dropToken: code === "wrong_epoch" || code === "bad_token" };
}

export async function readQueue(kv: KV): Promise<Ballot[]> {
  try { return JSON.parse((await kv.get(QUEUE_KEY)) ?? "[]") as Ballot[]; } catch { return []; }
}
async function writeQueue(kv: KV, q: Ballot[]) {
  if (q.length) await kv.set(QUEUE_KEY, JSON.stringify(q)); else await kv.del(QUEUE_KEY);
}
export async function enqueue(kv: KV, b: Ballot) {
  const q = (await readQueue(kv)).filter((x) => x.pollId !== b.pollId);
  q.push(b);
  await writeQueue(kv, q);
}

/** Vote now; on network failure, queue. Choice is remembered locally only (never sent anywhere). */
export async function castOrQueue(kv: KV, http: Http, relayPath: string, pollId: string, option: string, tok: Token, online: boolean, now = new Date()): Promise<VoteOutcome> {
  const b: Ballot = { pollId, option, preparedMsg: tok.preparedMsg, signature: tok.signature, queuedAt: now.toISOString() };
  if (!online) { await enqueue(kv, b); await kv.set(CHOICE_KEY(pollId), option); return { kind: "queued" }; }
  try {
    const out = await sendBallot(http, relayPath, b);
    if (out.kind !== "error") await kv.set(CHOICE_KEY(pollId), option);
    return out;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue(kv, b); await kv.set(CHOICE_KEY(pollId), option);
    return { kind: "queued" };
  }
}

/** Retry queued ballots. Network errors keep them; definitive server answers remove them. Tokens of a past epoch are dropped by the server (wrong_epoch). */
export async function flushQueue(kv: KV, http: Http, relayPath: string): Promise<{ sent: number; failed: { pollId: string; code: string }[]; remaining: number }> {
  const q = await readQueue(kv);
  const keep: Ballot[] = []; const failed: { pollId: string; code: string }[] = []; let sent = 0;
  for (const b of q) {
    try {
      const out = await sendBallot(http, relayPath, b);
      if (out.kind === "error") failed.push({ pollId: b.pollId, code: out.code }); else sent++;
    } catch (e) {
      if (!isNetworkError(e)) throw e;
      keep.push(b);
    }
  }
  await writeQueue(kv, keep);
  return { sent, failed, remaining: keep.length };
}
