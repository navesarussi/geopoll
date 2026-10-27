import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";
import { suite, blindSign, issuerKeys, nullifier, tokenEpoch, accountHash } from "@/lib/crypto";
import { castVote, results, seedDummy } from "@/lib/service";
import { type BallotStore } from "@/lib/store";
import { freshStores } from "./helpers";

process.env.BATCH_INTERVAL_SECONDS = "0";
import { DEMO_POLL, currentEpoch } from "@/lib/poll";
import { bucket, toPublic } from "@/lib/results";

async function clientToken(epoch = currentEpoch()) {
  const s = suite();
  const { publicKey } = await issuerKeys();
  const nonce = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32))).toString("hex");
  const prepared = s.prepare(new TextEncoder().encode(`geopoll|v2|${epoch}|T0|${nonce}`));
  const { blindedMsg, inv } = await s.blind(publicKey, prepared);
  const blindSig = await blindSign(blindedMsg);
  const signature = await s.finalize(publicKey, prepared, blindSig, inv);
  return { preparedMsg: prepared, signature, blindedMsg };
}
const vote = (b: BallotStore, t: Awaited<ReturnType<typeof clientToken>>, option: string) =>
  castVote(b, { pollId: DEMO_POLL.id, option, preparedMsg: t.preparedMsg, signature: t.signature });

describe("blind token", () => {
  it("issuer never sees the message it signs (blinded != prepared)", async () => {
    const t = await clientToken();
    expect(Buffer.from(t.blindedMsg).equals(Buffer.from(t.preparedMsg))).toBe(false);
    expect(tokenEpoch(t.preparedMsg)).toBe(currentEpoch());
  });
  it("rejects forged or tampered tokens", async () => {
    const b = (await freshStores()).ballots;
    const t = await clientToken();
    const bad = new Uint8Array(t.signature); bad[5] ^= 1;
    expect(await castVote(b, { pollId: DEMO_POLL.id, option: "yes", preparedMsg: t.preparedMsg, signature: bad })).toEqual({ ok: false, error: "bad_token" });
  });
  it("rejects token from another epoch", async () => {
    const t = await clientToken("1999-01");
    expect(await vote((await freshStores()).ballots, t, "yes")).toEqual({ ok: false, error: "wrong_epoch" });
  });
});

describe("nullifier / double vote / revote", () => {
  it("is stable per token+poll and differs across polls", async () => {
    const t = await clientToken();
    expect(nullifier(t.preparedMsg, "p1")).toBe(nullifier(t.preparedMsg, "p1"));
    expect(nullifier(t.preparedMsg, "p1")).not.toBe(nullifier(t.preparedMsg, "p2"));
  });
  it("second vote with same token replaces the first (last counts, counted once)", async () => {
    const b = (await freshStores()).ballots;
    const t = await clientToken();
    expect(await vote(b, t, "yes")).toEqual({ ok: true, status: "created" });
    expect(await vote(b, t, "no")).toEqual({ ok: true, status: "replaced" });
    expect(await b.tally(DEMO_POLL.id)).toEqual({}); // queued, not yet counted
    await b.flush();
    expect(await b.tally(DEMO_POLL.id)).toEqual({ no: 1 });
    expect(await vote(b, t, "partial")).toEqual({ ok: true, status: "replaced" });
    await b.flush();
    expect(await b.tally(DEMO_POLL.id)).toEqual({ partial: 1 });
  });
  it("identity issues at most one token per account per epoch", async () => {
    const id = (await freshStores()).identity;
    const a = accountHash("google:123");
    expect(await id.claimIssuance(a, "2026-10")).toBe(true);
    expect(await id.claimIssuance(a, "2026-10")).toBe(false);
    expect(await id.claimIssuance(a, "2026-11")).toBe(true);
    expect(a).not.toContain("123");
  });
  it("rejects unknown option", async () => {
    expect(await vote((await freshStores()).ballots, await clientToken(), "maybe")).toEqual({ ok: false, error: "bad_option" });
  });
});

describe("public results (ADR-0012)", () => {
  it("hides percentages below k and uses buckets", () => {
    expect(toPublic({ yes: 49 }, ["yes", "no"], new Date()).published).toBe(false);
    expect(bucket(49)).toBe("פחות מ-50");
    expect(bucket(120)).toBe("מעל 100");
    expect(bucket(1500)).toBe("מעל 1,000");
    const r = toPublic({ yes: 2, no: 1 }, ["yes", "no"], new Date());
    expect(r.percents).toBeNull();
  });
  it("rounds to whole percents and serves the cached snapshot within interval", async () => {
    const b = (await freshStores()).ballots;
    await seedDummy(b, 200);
    const t0 = new Date("2026-10-27T10:00:00Z");
    const r1 = await results(b, t0);
    expect(r1.published).toBe(true);
    expect(Object.values(r1.percents!).every(Number.isInteger)).toBe(true);
    await vote(b, await clientToken(), "unsure");
    const r2 = await results(b, new Date(t0.getTime() + 1000));
    expect(r2).toEqual(r1); // batched: no live update
  });
});
