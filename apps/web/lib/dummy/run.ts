import { webcrypto } from "node:crypto";
import { accountHash, blindSign, issuerKeys, suite } from "../crypto";
import { currentEpoch, DEMO_POLL } from "../poll";
import { castVote } from "../service";
import type { Stores } from "../store";
import type { Scenario } from "./generator";

/** Client side of the real protocol (prepare → blind → issuer blind-sign → finalize). */
async function obtainToken(stores: Stores, accountId: string, epoch: string) {
  if (!(await stores.identity.claimIssuance(accountHash(accountId), epoch))) return null;
  const s = suite();
  const { publicKey } = await issuerKeys();
  const nonce = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("hex");
  const prepared = s.prepare(new TextEncoder().encode(`geopoll|v1|${epoch}|${nonce}`));
  const { blindedMsg, inv } = await s.blind(publicKey, prepared);
  const signature = await s.finalize(publicKey, prepared, await blindSign(blindedMsg), inv);
  return { preparedMsg: prepared, signature };
}

export interface RunStats { accepted: number; replaced: number; rejected: Record<string, number>; expectedCounted: Record<string, number> }

/** Executes a scenario through the real identity + ballot paths. Expected tally = last choice per voting user. */
export async function runScenario(stores: Stores, sc: Scenario, now = new Date()): Promise<RunStats> {
  const epoch = currentEpoch(now);
  const tokens = new Map<number, Awaited<ReturnType<typeof obtainToken>>>();
  const last = new Map<number, string>();
  const st: RunStats = { accepted: 0, replaced: 0, rejected: {}, expectedCounted: {} };
  const reject = (k: string) => { st.rejected[k] = (st.rejected[k] ?? 0) + 1; };
  for (const a of sc.actions) {
    if (a.kind === "vote" || a.kind === "revote") {
      if (!tokens.has(a.user)) tokens.set(a.user, await obtainToken(stores, sc.users[a.user].accountId, epoch));
      const t = tokens.get(a.user);
      if (!t) { reject("no_token"); continue; }
      const r = await castVote(stores.ballots, { pollId: DEMO_POLL.id, option: a.option, ...t }, now);
      if (r.ok) { r.status === "replaced" ? st.replaced++ : st.accepted++; last.set(a.user, a.option); } else reject(r.error);
    } else if (a.kind === "double_issue") {
      const t = await obtainToken(stores, sc.users[a.user].accountId, epoch);
      if (t) throw new Error("SECURITY: second token issued in the same epoch");
      reject("already_issued");
    } else if (a.kind === "forged_token") {
      const fake = webcrypto.getRandomValues(new Uint8Array(256));
      const msg = new TextEncoder().encode(`${"x".repeat(32)}geopoll|v1|${epoch}|${"0".repeat(64)}`);
      const r = await castVote(stores.ballots, { pollId: DEMO_POLL.id, option: a.option, preparedMsg: msg, signature: fake }, now);
      if (r.ok) throw new Error("SECURITY: forged token accepted");
      reject(r.error);
    } else if (a.kind === "wrong_epoch") {
      const old = await obtainToken(stores, `${sc.users[a.user].accountId}:old`, "2000-01");
      const r = await castVote(stores.ballots, { pollId: DEMO_POLL.id, option: a.option, ...old! }, now);
      if (r.ok) throw new Error("SECURITY: token from another epoch accepted");
      reject(r.error);
    }
  }
  for (const o of last.values()) st.expectedCounted[o] = (st.expectedCounted[o] ?? 0) + 1;
  return st;
}
