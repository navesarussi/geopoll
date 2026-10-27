import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { freshStores } from "./helpers";
import { effectiveStatus, localToIso, isoToLocal, parseOptions, savePoll } from "@/lib/polls";
import { getPoll, setDbPolls } from "@/lib/config";
import { runAdminAction } from "@/lib/admin";
import { bankEnabled, bankPrefill, bankSize, searchBank } from "@/lib/question-bank";
import type { Stores } from "@/lib/store";

let s: Stores;
beforeEach(async () => { s = await freshStores(); setDbPolls([]); });
afterEach(() => { setDbPolls([]); delete process.env.GEOPOLL_QUESTION_BANK; });
const input = (o = {}) => ({ id: "sched-1", kind: "referendum", question: { he: "שאלה?" }, options: parseOptions("y | כן\nn | לא"), ...o });

describe("#79 scheduled open/close", () => {
  it("converts Israel wall time to UTC (DST-aware) and back", () => {
    expect(localToIso("2026-07-01T10:00", "Asia/Jerusalem")).toBe("2026-07-01T07:00:00.000Z");
    expect(localToIso("2026-12-01T10:00", "Asia/Jerusalem")).toBe("2026-12-01T08:00:00.000Z");
    expect(isoToLocal("2026-12-01T08:00:00.000Z", "Asia/Jerusalem")).toBe("2026-12-01T10:00");
    expect(localToIso("", "Asia/Jerusalem")).toBe("");
    expect(localToIso("garbage", "Asia/Jerusalem")).toBe("invalid");
  });
  it("rejects bad windows", async () => {
    expect(await savePoll(s, "a", input({ opensAt: "2026-12-02T00:00:00Z", closesAt: "2026-12-01T00:00:00Z" }), null)).toMatchObject({ error: "bad_schedule" });
    expect(await savePoll(s, "a", input({ opensAt: "invalid" }), null)).toMatchObject({ error: "bad_schedule" });
  });
  it("manual closed wins; otherwise the window decides", async () => {
    await savePoll(s, "a", input({ opensAt: "2026-12-01T08:00:00Z", closesAt: "2026-12-10T08:00:00Z" }), null);
    const p = getPoll("sched-1")!;
    expect(await effectiveStatus(s.ballots, p, new Date("2026-12-05T00:00:00Z"))).toBe("closed"); // created closed
    await runAdminAction(s, "a", { action: "poll_open", pollId: "sched-1" });
    expect(await effectiveStatus(s.ballots, p, new Date("2026-11-30T00:00:00Z"))).toBe("scheduled");
    expect(await effectiveStatus(s.ballots, p, new Date("2026-12-05T00:00:00Z"))).toBe("open");
    expect(await effectiveStatus(s.ballots, p, new Date("2026-12-10T08:00:00Z"))).toBe("closed");
  });
});

describe("#79 question bank (behind flag, lawyer D4)", () => {
  it("is off by default and on only with the staging override", () => {
    expect(bankEnabled()).toBe(false);
    process.env.GEOPOLL_QUESTION_BANK = "1";
    expect(bankEnabled()).toBe(true);
  });
  it("searches and prefills without Hebrew (a human must write it)", () => {
    expect(bankSize()).toBeGreaterThan(1000);
    const h = searchBank("hostages")[0];
    expect(h).toBeTruthy();
    const pf = bankPrefill(h);
    expect(pf.id).toBe("");
    const opts = parseOptions(pf.options);
    expect(opts.length).toBeGreaterThanOrEqual(2);
    expect(opts.every((o) => o.label.he === "" && o.label.en)).toBe(true);
    expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
  });
});
