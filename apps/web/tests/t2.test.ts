import { describe, it, expect, beforeEach } from "vitest";
import { freshStores } from "./helpers";
import { MockT2Provider, docDedupeHash, t2Provider } from "@/lib/identity/t2";
import { completeT2 } from "@/lib/identity/t2-service";
import { resolveTier, ADAPTERS } from "@/lib/identity";
import type { Stores } from "@/lib/store";

let s: Stores; let p: MockT2Provider;
const img = () => new Uint8Array([1, 2, 3, 4]);
beforeEach(async () => { s = await freshStores(); p = new MockT2Provider(); });

describe("T2 (ADR-0024, mock provider)", () => {
  it("passes a dummy document, stores only a keyed hash, wipes evidence", async () => {
    const { sessionId } = await p.start();
    const ev = { document: img(), selfie: img(), docNumber: "DUMMY-1234" };
    expect(await completeT2(s.identity, p, "acct-a", sessionId, ev)).toEqual({ ok: true, tier: "T2", effectiveFrom: "next_epoch" });
    expect([...ev.document, ...ev.selfie].every((x) => x === 0)).toBe(true);
    expect(await s.identity.isT2("acct-a")).toBe(true);
    expect(docDedupeHash("DUMMY-1234")).not.toContain("1234");
  });
  it("blocks one document backing two accounts; rejects reused sessions and non-dummy docs", async () => {
    await completeT2(s.identity, p, "acct-a", (await p.start()).sessionId, { document: img(), selfie: img(), docNumber: "DUMMY-1234" });
    expect(await completeT2(s.identity, p, "acct-b", (await p.start()).sessionId, { document: img(), selfie: img(), docNumber: "dummy-1234 ".toUpperCase().trim() }))
      .toEqual({ ok: false, error: "duplicate_document" });
    expect((await completeT2(s.identity, p, "acct-c", "nope", { document: img(), selfie: img(), docNumber: "DUMMY-9999" })).ok).toBe(false);
    expect((await completeT2(s.identity, p, "acct-c", (await p.start()).sessionId, { document: img(), selfie: img(), docNumber: "123456782" })).ok).toBe(false);
    expect(await completeT2(s.identity, p, "acct-c", (await p.start()).sessionId, { document: img(), selfie: new Uint8Array([0]), docNumber: "DUMMY-9999" }))
      .toEqual({ ok: false, error: "liveness_failed" });
  });
  it("flag gating: off by default; mock refused in production unless demo", () => {
    expect(t2Provider({} as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(t2Provider({ FEATURE_T2_KYC: "1", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBeNull();
    expect(t2Provider({ FEATURE_T2_KYC: "1", NODE_ENV: "test" } as unknown as NodeJS.ProcessEnv)?.id).toBe("mock");
    expect(t2Provider({ FEATURE_T2_KYC: "1", T2_PROVIDER: "acme" } as unknown as NodeJS.ProcessEnv)).toBeNull();
  });
  it("tier resolves to T2 only when flag on and verified", async () => {
    const ctx = { provider: "google", accountId: "x", flags: { t2Verified: true } };
    expect(await resolveTier(ctx, { FEATURE_T2_KYC: "1" } as unknown as NodeJS.ProcessEnv, ADAPTERS)).toBe("T2");
    expect(await resolveTier(ctx, {} as unknown as NodeJS.ProcessEnv, ADAPTERS)).toBe("T0");
  });
});
