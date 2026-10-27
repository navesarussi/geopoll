import { describe, expect, it } from "vitest";
import { blindSign, nullifier, publicKeySpki, verifyToken } from "../../web/lib/crypto";
import { b64, unb64 } from "../src/core/b64";
import { deviceNullifier, getOrIssueToken, TOKEN_KEY, TokenError } from "../src/core/token";
import { fakeHttp, memKV } from "./helpers";

const server = (opts: { tier?: string | null; status?: number } = {}) => fakeHttp(async (c) => {
  if (c.path === "/api/identity/pubkey") return { status: 200, json: { keys: { T0: await publicKeySpki("T0") }, epoch: "2026-10" } };
  if (c.path === "/api/identity/tier") return opts.status ? { status: opts.status, json: {} } : { status: 200, json: { tier: opts.tier === undefined ? "T0" : opts.tier } };
  if (c.path === "/api/identity/issue") {
    const { blindedMsg } = c.body as { blindedMsg: string };
    return { status: 200, json: { blindSig: Buffer.from(await blindSign(unb64(blindedMsg), "T0")).toString("base64") } };
  }
  return { status: 404, json: null };
});

describe("ballot-token wallet (real RFC 9474 against the web issuer)", () => {
  it("issues a token the vote service accepts, stores it, and reuses it in the same epoch", async () => {
    const kv = memKV(), http = server();
    const t = await getOrIssueToken(kv, http);
    expect(await verifyToken(unb64(t.preparedMsg), unb64(t.signature))).toBe("T0");
    expect(kv.m.has(TOKEN_KEY)).toBe(true);
    // identity calls carry auth; the blinded message is all the issuer sees
    expect(http.calls.find((c) => c.path === "/api/identity/issue")?.auth).toBe(true);
    const again = await getOrIssueToken(kv, http);
    expect(again).toEqual(t);
    expect(http.calls.filter((c) => c.path === "/api/identity/issue")).toHaveLength(1);
  });
  it("device nullifier equals server nullifier", async () => {
    const t = await getOrIssueToken(memKV(), server());
    expect(await deviceNullifier("p1", t.preparedMsg)).toBe(nullifier(unb64(t.preparedMsg), "p1"));
  });
  it("errors clearly when unauthenticated or without tier", async () => {
    await expect(getOrIssueToken(memKV(), server({ status: 401 }))).rejects.toThrow(TokenError);
    await expect(getOrIssueToken(memKV(), server({ tier: null }))).rejects.toThrow("no_tier");
  });
  it("b64 round-trips", () => {
    for (const n of [0, 1, 2, 3, 31, 256]) { const u = crypto.getRandomValues(new Uint8Array(n)); expect(unb64(b64(u))).toEqual(u); expect(b64(u)).toBe(Buffer.from(u).toString("base64")); }
  });
});
