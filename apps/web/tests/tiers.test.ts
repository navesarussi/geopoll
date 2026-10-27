import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { blindSign, issuerKeys, parseToken, suite, verifyToken, type Tier } from "@/lib/crypto";
import { resolveTier, tierForAccount, type TierAdapter } from "@/lib/identity";
import { castVote, results } from "@/lib/service";
import { currentEpoch, DEMO_POLL } from "@/lib/poll";
import { freshStores } from "./helpers";

async function token(claimed: Tier, signedWith: Tier) {
  const s = suite();
  const { publicKey } = await issuerKeys(claimed);
  const nonce = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("hex");
  const prepared = s.prepare(new TextEncoder().encode(`geopoll|v2|${currentEpoch()}|${claimed}|${nonce}`));
  const { blindedMsg, inv } = await s.blind(publicKey, prepared);
  let blindSig: Uint8Array;
  try { blindSig = await blindSign(blindedMsg, signedWith); } catch { return null; } // out of range for other key
  try { return { preparedMsg: prepared, signature: await s.finalize(publicKey, prepared, blindSig, inv) }; }
  catch { return null; } // finalize verifies; wrong-key signature fails here
}

describe("identity tiers (T-107, ADR-0019)", () => {
  it("T0 for google/demo; T1 only with flag AND verification; T2/T3 stubs off", async () => {
    expect(await tierForAccount("google:1", {} as NodeJS.ProcessEnv)).toBe("T0");
    expect(await tierForAccount("demo:x", {} as NodeJS.ProcessEnv)).toBe("T0");
    expect(await tierForAccount("github:1", {} as NodeJS.ProcessEnv)).toBeNull();
    const ctx = { provider: "google", accountId: "1", flags: { idNumberVerified: true } };
    expect(await resolveTier(ctx, {} as NodeJS.ProcessEnv)).toBe("T0"); // flag off (needs-lawyer)
    expect(await resolveTier(ctx, { FEATURE_T1_ID: "1" } as unknown as NodeJS.ProcessEnv)).toBe("T1");
  });
  it("adapters are pluggable: highest satisfied enabled tier wins", async () => {
    const fake: TierAdapter = { tier: "T2", enabled: () => true, satisfies: async () => true };
    expect(await resolveTier({ provider: "google", accountId: "1", flags: {} }, {} as NodeJS.ProcessEnv, [fake])).toBe("T2");
  });
  it("tier is bound by the signing key: claiming a higher tier than signed is rejected", async () => {
    const ok = await token("T0", "T0");
    expect(await verifyToken(ok!.preparedMsg, ok!.signature)).toBe("T0");
    expect(parseToken(ok!.preparedMsg)?.tier).toBe("T0");
    const forged = await token("T2", "T0"); // client writes T2, issuer signed with T0 key
    expect(forged === null || (await verifyToken(forged.preparedMsg, forged.signature)) === null).toBe(true);
  });
  it("tier travels with the ballot and labels results basic vs verified", async () => {
    const { ballots } = await freshStores();
    for (let i = 0; i < 55; i++) {
      const t = await token("T2", "T2");
      expect((await castVote(ballots, { pollId: DEMO_POLL.id, option: "yes", ...t! })).ok).toBe(true);
    }
    process.env.BATCH_INTERVAL_SECONDS = "0";
    expect((await results(ballots)).assurance).toBe("verified");
    const t0 = await token("T0", "T0");
    await castVote(ballots, { pollId: DEMO_POLL.id, option: "no", ...t0! });
    process.env.SNAPSHOT_INTERVAL_SECONDS = "0";
    expect((await results(ballots, new Date(Date.now() + 1000))).assurance).toBe("basic");
    delete process.env.SNAPSHOT_INTERVAL_SECONDS;
  }, 60000);
});
