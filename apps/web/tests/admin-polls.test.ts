import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshStores } from "./helpers";
import { savePoll, syncPolls, parseOptions, type PollInput } from "@/lib/polls";
import { getPoll, polls, setDbPolls } from "@/lib/config";
import { castVote, results } from "@/lib/service";
import { dashboard, runAdminAction } from "@/lib/admin";
import type { Stores } from "@/lib/store";

let s: Stores;
const base = (o: Partial<PollInput> = {}): PollInput => ({
  id: "trust-gov", kind: "referendum", question: { he: "האם את/ה סומך/ת על הממשלה?", en: "Do you trust the government?" },
  options: parseOptions("yes | כן | Yes\nno | לא | No"), ...o,
});
beforeEach(async () => { s = await freshStores(); setDbPolls([]); });
afterEach(() => { setDbPolls([]); delete process.env.GEOPOLL_ELECTIONS; });

describe("admin poll authoring", () => {
  it("creates a DB poll (closed by default), visible via getPoll, audit-logged", async () => {
    const r = await savePoll(s, "a@x.com", base(), null);
    expect(r).toEqual({ ok: true, version: 1 });
    expect(getPoll("trust-gov")?.question.en).toBe("Do you trust the government?");
    expect(await s.ballots.pollStatus("trust-gov")).toBe("closed");
    const log = await s.content.auditLog();
    expect(log.some((l) => l.action === "poll_create" && l.target === "trust-gov")).toBe(true);
    expect((await dashboard(s)).polls.some((p) => p.id === "trust-gov")).toBe(true);
  });
  it("validates input and refuses config ids / duplicates", async () => {
    expect(await savePoll(s, "a", base({ id: "Bad Id" }), null)).toMatchObject({ error: "bad_id" });
    expect(await savePoll(s, "a", base({ options: parseOptions("yes | כן") }), null)).toMatchObject({ error: "bad_options" });
    expect(await savePoll(s, "a", base({ question: { en: "x" } }), null)).toMatchObject({ error: "bad_text" });
    expect(await savePoll(s, "a", base({ kind: "mayor" }), null)).toMatchObject({ error: "bad_kind" });
    expect(await savePoll(s, "a", base({ id: polls()[0].id }), null)).toMatchObject({ error: "reserved_id" });
    await savePoll(s, "a", base(), null);
    expect(await savePoll(s, "a", base(), null)).toMatchObject({ error: "exists" });
    expect(await savePoll(s, "a", base({ options: parseOptions("y | כן\ny | לא") }), null)).toMatchObject({ error: "bad_options" });
  });
  it("edits with optimistic version; locks options once ballots exist; k-gates results", async () => {
    await savePoll(s, "a", base(), null);
    expect(await savePoll(s, "a", base({ question: { he: "שאלה מעודכנת" } }), 1)).toEqual({ ok: true, version: 2 });
    expect(await savePoll(s, "a", base(), 1)).toMatchObject({ error: "conflict" });
    await runAdminAction(s, "a", { action: "poll_open", pollId: "trust-gov" });
    await s.ballots.enqueue("trust-gov", "n1", "yes", "2026-10", "T0");
    expect(await savePoll(s, "a", base({ options: parseOptions("yes | כן\nno | לא\nmaybe | אולי") }), 2)).toMatchObject({ error: "options_locked" });
    expect(await savePoll(s, "a", base({ kind: "knesset-election" }), 2)).toMatchObject({ error: "kind_locked" });
    const res = await results(s.ballots, new Date(), "trust-gov");
    expect(res.published).toBe(false); // below k
  });
  it("refuses election polls during the §16ה blackout", async () => {
    process.env.GEOPOLL_ELECTIONS = "2026-10-29";
    const now = new Date("2026-10-28T12:00:00+02:00");
    expect(await savePoll(s, "a", base({ id: "k26", kind: "knesset-election" }), null, now)).toMatchObject({ error: "blackout" });
    expect((await savePoll(s, "a", base({ id: "ref2" }), null, now)).ok).toBe(true);
  });
  it("closed admin poll rejects votes", async () => {
    await savePoll(s, "a", base(), null);
    const r = await castVote(s.ballots, { pollId: "trust-gov", option: "yes", preparedMsg: new Uint8Array(8), signature: new Uint8Array(8) });
    expect(r).toMatchObject({ ok: false, error: "closed" });
    await syncPolls(s.ballots, true);
  });
});
