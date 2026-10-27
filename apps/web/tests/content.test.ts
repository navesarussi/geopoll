import { describe, it, expect, beforeEach } from "vitest";
import { freshStores } from "./helpers";
import { authorHash, authorKeys, createPost, LIMITS } from "@/lib/content";
import { accountHash } from "@/lib/crypto";
import { DEMO_POLL } from "@/lib/poll";
import type { Stores } from "@/lib/store";

let s: Stores;
const A = "google:alice", B = "google:bob";
const anon = { anonymous: true };
beforeEach(async () => { s = await freshStores(); });

describe("public survey (zone C)", () => {
  it("creates anonymous positions and threaded replies", async () => {
    const p = await createPost(s.content, A, { option: "yes", body: "כי זה טוב", ...anon });
    expect(p.ok).toBe(true);
    const r = await createPost(s.content, B, { parentId: (p as { id: number }).id, body: "לא מסכים", ...anon });
    expect(r.ok).toBe(true);
    const list = await s.content.list(DEMO_POLL.id, authorKeys(A, DEMO_POLL.id));
    expect(list[0].display_name).toMatch(/^אנונימי\/ת \d{4}$/);
    expect(list[0].mine).toBe(true);
    expect(list[1].parent_id).toBe(list[0].id);
    expect(JSON.stringify(list)).not.toContain(authorHash(A));
    expect(await s.content.positionCounts(DEMO_POLL.id)).toEqual({ yes: 1 });
  });
  it("enforces limits, profanity, one position per user (across anon/profile), valid option", async () => {
    expect(await createPost(s.content, A, { option: "yes", body: "x".repeat(LIMITS.position + 1), ...anon })).toEqual({ ok: false, error: "too_long" });
    expect(await createPost(s.content, A, { option: "yes", body: "אתה מניאק", ...anon })).toEqual({ ok: false, error: "profanity" });
    expect(await createPost(s.content, A, { option: "nope", body: "hi", ...anon })).toEqual({ ok: false, error: "bad_option" });
    expect((await createPost(s.content, A, { option: "no", body: "hi", ...anon })).ok).toBe(true);
    await s.content.upsertProfile(authorHash(A), "pidAAAAA", { displayName: "Alice", bio: "", avatar: "🦉" });
    expect(await createPost(s.content, A, { option: "yes", body: "again", anonymous: false, consent: true })).toEqual({ ok: false, error: "duplicate_position" });
    expect(await createPost(s.content, A, { parentId: 99999, body: "r", ...anon })).toEqual({ ok: false, error: "no_parent" });
  });
  it("rate limits across both identities", async () => {
    const p = await createPost(s.content, A, { option: "no", body: "root", ...anon }) as { id: number };
    await s.content.upsertProfile(authorHash(B), "pidBBBBB", { displayName: "Bob", bio: "", avatar: "🦉" });
    for (let i = 0; i < LIMITS.perWindow; i++) expect((await createPost(s.content, B, { parentId: p.id, body: `r${i}`, anonymous: i % 2 === 0, consent: true })).ok).toBe(true);
    expect(await createPost(s.content, B, { parentId: p.id, body: "too many", ...anon })).toEqual({ ok: false, error: "rate_limited" });
  });
  it("only the author can delete; reports hide after threshold", async () => {
    const { id } = await createPost(s.content, A, { option: "no", body: "root", ...anon }) as { id: number };
    expect(await s.content.deleteOwn(id, authorKeys(B, DEMO_POLL.id))).toBe(false);
    expect(await s.content.report(id, authorHash(B))).toBe(true);
    expect(await s.content.report(id, authorHash(B))).toBe(false);
    await s.content.report(id, authorHash("c")); await s.content.report(id, authorHash("d"));
    expect(await s.content.list(DEMO_POLL.id)).toHaveLength(0);
    const { id: id2 } = await createPost(s.content, B, { option: "yes", body: "mine", ...anon }) as { id: number };
    expect(await s.content.deleteOwn(id2, authorKeys(B, DEMO_POLL.id))).toBe(true);
    expect((await s.content.list(DEMO_POLL.id))[0]).toMatchObject({ deleted: true, body: "" });
  });
  it("zone C author hash differs from zone A account hash (no join key)", () => {
    expect(authorHash("google:alice")).not.toBe(accountHash("google:alice"));
  });
});
