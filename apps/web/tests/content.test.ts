import { describe, it, expect, beforeEach } from "vitest";
import { freshStores } from "./helpers";
import { authorHash, createPost, LIMITS, pseudonym } from "@/lib/content";
import { accountHash } from "@/lib/crypto";
import { DEMO_POLL } from "@/lib/poll";
import type { Stores } from "@/lib/store";

let s: Stores;
beforeEach(async () => { s = await freshStores(); });
const A = authorHash("google:alice"), B = authorHash("google:bob");

describe("public survey (zone C)", () => {
  it("creates a position with a pseudonym by default, and threaded replies", async () => {
    const p = await createPost(s.content, A, { option: "yes", body: "כי זה טוב" });
    expect(p.ok).toBe(true);
    const r = await createPost(s.content, B, { parentId: (p as { id: number }).id, body: "לא מסכים" });
    expect(r.ok).toBe(true);
    const list = await s.content.list(DEMO_POLL.id, A);
    expect(list[0].display_name).toBe(pseudonym(A));
    expect(list[0].mine).toBe(true);
    expect(list[1].parent_id).toBe(list[0].id);
    expect(JSON.stringify(list)).not.toContain(A); // author hash never exposed
    expect(await s.content.positionCounts(DEMO_POLL.id)).toEqual({ yes: 1 });
  });
  it("enforces limits, profanity, one position per user, valid option", async () => {
    expect(await createPost(s.content, A, { option: "yes", body: "x".repeat(LIMITS.position + 1) })).toEqual({ ok: false, error: "too_long" });
    expect(await createPost(s.content, A, { option: "yes", body: "אתה מניאק" })).toEqual({ ok: false, error: "profanity" });
    expect(await createPost(s.content, A, { option: "nope", body: "hi" })).toEqual({ ok: false, error: "bad_option" });
    expect((await createPost(s.content, A, { option: "no", body: "hi" })).ok).toBe(true);
    expect(await createPost(s.content, A, { option: "yes", body: "again" })).toEqual({ ok: false, error: "duplicate_position" });
    expect(await createPost(s.content, A, { parentId: 99999, body: "r" })).toEqual({ ok: false, error: "no_parent" });
  });
  it("rate limits", async () => {
    const p = await createPost(s.content, A, { option: "no", body: "root" }) as { id: number };
    for (let i = 0; i < LIMITS.perWindow - 1; i++) expect((await createPost(s.content, B, { parentId: p.id, body: `r${i}` })).ok).toBe(true);
    expect((await createPost(s.content, B, { parentId: p.id, body: "one more" })).ok).toBe(true);
    expect(await createPost(s.content, B, { parentId: p.id, body: "too many" })).toEqual({ ok: false, error: "rate_limited" });
  });
  it("only the author can delete; reports hide after threshold", async () => {
    const { id } = await createPost(s.content, A, { option: "no", body: "root" }) as { id: number };
    expect(await s.content.deleteOwn(id, B)).toBe(false);
    expect(await s.content.report(id, B)).toBe(true);
    expect(await s.content.report(id, B)).toBe(false); // one report per user
    await s.content.report(id, authorHash("c")); await s.content.report(id, authorHash("d"));
    expect(await s.content.list(DEMO_POLL.id, null)).toHaveLength(0);
    const { id: id2 } = await createPost(s.content, B, { option: "yes", body: "mine" }) as { id: number };
    expect(await s.content.deleteOwn(id2, B)).toBe(true);
    expect((await s.content.list(DEMO_POLL.id, null))[0]).toMatchObject({ deleted: true, body: "" });
  });
  it("zone C author hash differs from zone A account hash (no join key)", () => {
    expect(authorHash("google:alice")).not.toBe(accountHash("google:alice"));
  });
});
