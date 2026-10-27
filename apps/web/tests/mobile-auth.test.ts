import { beforeAll, describe, expect, it } from "vitest";
import { encode } from "next-auth/jwt";
import { bearerSession, challengeOf, exchangeHandoff, mintHandoff, SESSION_SALT, validChallenge } from "@/lib/mobile-auth";

const verifier = "v".repeat(20) + "A1_-".repeat(6); // 44 chars, base64url alphabet
beforeAll(() => { process.env.NEXTAUTH_SECRET = "test-only-secret"; });

describe("mobile sign-in (PKCE-style handoff)", () => {
  it("validates challenge format", () => {
    expect(validChallenge(challengeOf(verifier))).toBe(true);
    expect(validChallenge("short")).toBe(false);
    expect(validChallenge(null)).toBe(false);
  });
  it("exchanges handoff with the right verifier → bearer resolves the account", async () => {
    const code = await mintHandoff("google:123", "Nave", challengeOf(verifier));
    const tok = await exchangeHandoff(code, verifier);
    expect(tok).toBeTruthy();
    expect(await bearerSession(`Bearer ${tok}`)).toEqual({ acct: "google:123", name: "Nave" });
  });
  it("rejects an intercepted code without the verifier", async () => {
    const code = await mintHandoff("google:123", null, challengeOf(verifier));
    expect(await exchangeHandoff(code, "x".repeat(43))).toBeNull();
  });
  it("handoff code itself is not a valid bearer, and a web-session token is not either", async () => {
    const code = await mintHandoff("google:123", null, challengeOf(verifier));
    expect(await bearerSession(`Bearer ${code}`)).toBeNull();
    const web = await encode({ token: { acct: "google:123" }, secret: "test-only-secret" });
    expect(await bearerSession(`Bearer ${web}`)).toBeNull();
    const noMob = await encode({ token: { acct: "google:1" }, secret: "test-only-secret", salt: SESSION_SALT });
    expect(await bearerSession(`Bearer ${noMob}`)).toBeNull();
    expect(await bearerSession(null)).toBeNull();
  });
});
