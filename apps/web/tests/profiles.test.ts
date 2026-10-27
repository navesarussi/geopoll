import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, privateDecrypt, constants } from "node:crypto";
import { freshStores } from "./helpers";
import { anonHash, authorHash, createPost, resolveAnonymous, validateProfile } from "@/lib/content";
import { DEMO_POLL } from "@/lib/poll";
import type { Stores } from "@/lib/store";
import { base } from "@geopoll/config";

let s: Stores;
const A = "google:alice";
beforeEach(async () => { s = await freshStores(); });
afterEach(() => { delete process.env.MOD_SEAL_PUBLIC_KEY; });

describe("ADR-0023 public identity", () => {
  it("default is profile: needs a profile, then explicit consent once, and links the post to the profile", async () => {
    expect(base.features.publicIdentityDefault).toBe("profile");
    expect(await createPost(s.content, A, { option: "yes", body: "בשמי" })).toEqual({ ok: false, error: "no_profile" });
    await s.content.upsertProfile(authorHash(A), "pidAlice1", { displayName: "אליס", bio: "bio", avatar: "🦉" });
    expect(await createPost(s.content, A, { option: "yes", body: "בשמי" })).toEqual({ ok: false, error: "consent_required" });
    const r = await createPost(s.content, A, { option: "yes", body: "בשמי", consent: true });
    expect(r).toMatchObject({ ok: true, anonymous: false });
    const [p] = await s.content.list(DEMO_POLL.id);
    expect(p).toMatchObject({ display_name: "אליס", pid: "pidAlice1", avatar: "🦉", anon: false });
    // consent remembered
    expect((await createPost(s.content, A, { parentId: p.id, body: "עוד" })).ok).toBe(true);
    // profile rename propagates
    await s.content.upsertProfile(authorHash(A), "ignored", { displayName: "אליס ב", bio: "", avatar: "🌱" });
    expect((await s.content.list(DEMO_POLL.id))[0].display_name).toBe("אליס ב");
    expect((await s.content.getProfile(authorHash(A)))!.pid).toBe("pidAlice1"); // pid stable
  });
  it("anonymous posts: no profile link, separate per-poll key, excluded from the public profile", async () => {
    await s.content.upsertProfile(authorHash(A), "pidAlice1", { displayName: "אליס", bio: "", avatar: "🦉" });
    await createPost(s.content, A, { option: "no", body: "אנונימי", anonymous: true });
    const [p] = await s.content.list(DEMO_POLL.id);
    expect(p).toMatchObject({ anon: true, pid: null, avatar: null });
    expect(p.display_name).not.toContain("אליס");
    expect(anonHash(A, "p1")).not.toBe(anonHash(A, "p2"));
    expect(anonHash(A, DEMO_POLL.id)).not.toBe(authorHash(A));
    const pub = await s.content.publicProfile("pidAlice1");
    expect(pub!.posts).toHaveLength(0);
    expect(JSON.stringify(pub)).not.toMatch(/profile_hash|@/);
  });
  it("sealed moderation envelope opens only with the offline private key", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.MOD_SEAL_PUBLIC_KEY = publicKey.export({ type: "spki", format: "pem" }) as string;
    await createPost(s.content, A, { option: "no", body: "x", anonymous: true });
    const db = (s.content as unknown as { db: { q: (t: string) => Promise<{ mod_seal: string }[]> } }).db;
    const [{ mod_seal }] = await db.q("select mod_seal from zone_c.posts");
    const opened = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, Buffer.from(mod_seal, "base64")).toString();
    expect(opened).toBe(authorHash(A));
  });
  it("teen hook defaults to anonymous; explicit choice wins; config can flip the default", () => {
    const teen = { pid: "x", display_name: "x", bio: "", avatar: "", is_minor: true, consented: false };
    expect(resolveAnonymous(undefined, teen, base.features)).toBe(true);
    expect(resolveAnonymous(false, teen, base.features)).toBe(false);
    expect(resolveAnonymous(undefined, null, base.features)).toBe(false);
    expect(resolveAnonymous(undefined, null, { ...base.features, publicIdentityDefault: "anonymous" })).toBe(true);
  });
  it("profile validation: limits, profanity, fixed avatars only", () => {
    expect(validateProfile({ displayName: "" })).toEqual({ ok: false, error: "bad_request" });
    expect(validateProfile({ displayName: "x".repeat(41) })).toEqual({ ok: false, error: "too_long" });
    expect(validateProfile({ displayName: "מניאק" })).toEqual({ ok: false, error: "profanity" });
    const v = validateProfile({ displayName: "A", avatar: "https://evil.example/p.png" });
    expect(v.ok && v.value.avatar).toBe("🗳️");
  });
});
