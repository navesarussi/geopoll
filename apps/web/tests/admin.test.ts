import { describe, it, expect, beforeEach } from "vitest";
import { freshStores } from "./helpers";
import { adminEmails, adminRole, dashboard, runAdminAction } from "@/lib/admin";
import { createPost } from "@/lib/content";
import { castVote, seedDummy } from "@/lib/service";
import { DEMO_POLL } from "@/lib/poll";
import type { Stores } from "@/lib/store";

let s: Stores;
const env = (v?: string) => ({ ADMIN_EMAILS: v } as unknown as NodeJS.ProcessEnv);
beforeEach(async () => { s = await freshStores(); });

describe("admin access (T-323)", () => {
  it("fails closed: empty allowlist, demo logins, non-listed emails", () => {
    expect(adminEmails(env(undefined))).toEqual([]);
    expect(adminRole("google:1", "a@x.com", env(""))).toBeNull();
    expect(adminRole("demo:1", "a@x.com", env("a@x.com"))).toBeNull();
    expect(adminRole("google:1", "b@x.com", env("a@x.com"))).toBeNull();
    expect(adminRole("google:1", "A@X.com", env(" a@x.com , c@y.org"))).toBe("admin");
  });
});

describe("admin dashboard: aggregates only", () => {
  it("k-gates turnout and never exposes ballot-level data", async () => {
    await seedDummy(s.ballots, 10, DEMO_POLL.id);
    let d = await dashboard(s);
    const row = d.polls.find((p) => p.id === DEMO_POLL.id)!;
    expect(row.passesK).toBe(false);
    expect(row.turnout).toMatch(/^</);
    await seedDummy(s.ballots, 120, DEMO_POLL.id);
    d = await dashboard(s);
    const json = JSON.stringify(d);
    expect(d.polls.find((p) => p.id === DEMO_POLL.id)!.passesK).toBe(true);
    expect(json).not.toMatch(/seed-|nullifier|option_id|"yes"|"no"/);
    expect(json).not.toMatch(/dev-only/);
  });
});

describe("admin actions + audit", () => {
  it("close poll blocks voting; open restores; audited", async () => {
    await runAdminAction(s, "admin@x.com", { action: "poll_close", pollId: DEMO_POLL.id });
    const r = await castVote(s.ballots, { pollId: DEMO_POLL.id, option: "yes", preparedMsg: new Uint8Array(8), signature: new Uint8Array(8) });
    expect(r).toEqual({ ok: false, error: "closed" });
    await runAdminAction(s, "admin@x.com", { action: "poll_open", pollId: DEMO_POLL.id });
    expect(await s.ballots.pollStatus(DEMO_POLL.id)).toBe("open");
    expect(await runAdminAction(s, "admin@x.com", { action: "poll_close", pollId: "nope" })).toBe(false);
    const log = await s.content.auditLog();
    expect(log.map((l) => l.action)).toEqual(["poll_open", "poll_close"]);
  });
  it("moderation: hide removes from feed, ban blocks author, everything audited", async () => {
    const p = await createPost(s.content, "google:alice", { option: "yes", body: "hello", anonymous: true });
    const id = (p as { id: number }).id;
    await s.content.report(id, "r1");
    expect((await s.content.reportedQueue()).map((x) => x.id)).toEqual([id]);
    await runAdminAction(s, "m@x.com", { action: "hide", postId: id });
    expect(await s.content.list(DEMO_POLL.id, [])).toHaveLength(0);
    await runAdminAction(s, "m@x.com", { action: "ban", postId: id, reason: "spam" });
    expect(await createPost(s.content, "google:alice", { parentId: id, body: "again", anonymous: true })).toEqual({ ok: false, error: "banned" });
    await runAdminAction(s, "m@x.com", { action: "unban", postId: id });
    await runAdminAction(s, "m@x.com", { action: "clear", postId: id });
    expect(await s.content.list(DEMO_POLL.id, [])).toHaveLength(1);
    const log = await s.content.auditLog();
    expect(log.map((l) => l.action)).toEqual(["clear", "unban", "ban", "hide"]);
    expect(log[2].detail).toContain("spam");
  });
});
