import { describe, expect, it } from "vitest";
import { canVote, chartRows, pollChip } from "../src/core/ui-logic";
import { resultsState } from "../src/core/polls";
import { contrast, palettes, textDir } from "../src/theme/tokens";
import { DICTS } from "@geopoll/i18n";

describe("design tokens", () => {
  for (const [name, c] of Object.entries(palettes)) {
    it(`${name}: text pairs meet WCAG AA (4.5:1)`, () => {
      const pairs: [string, string][] = [[c.fg, c.bg], [c.fg, c.surface], [c.muted, c.surface], [c.muted, c.bg], [c.primaryFg, c.primary], [c.primary, c.surface],
        [c.ok, c.okBg], [c.err, c.errBg], [c.warnFg, c.warnBg], [c.betaFg, c.betaBg], [c.primary, c.primarySoft], [c.muted, c.surfaceAlt]];
      for (const [a, b] of pairs) expect(contrast(a, b), `${a} on ${b}`).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: chart colors are visible on surface (3:1 non-text)`, () => {
      for (const col of c.chart) expect(contrast(col, c.surface), col).toBeGreaterThanOrEqual(3);
    });
  }
  it("RTL/LTR text props: always start-aligned relative to the root direction (bug-learnings #5)", () => {
    expect(textDir("rtl")).toEqual({ writingDirection: "rtl", textAlign: "left" });
    expect(textDir("ltr")).toEqual({ writingDirection: "ltr", textAlign: "left" });
  });
});

describe("poll status chip + vote gating", () => {
  const p = (status: "open" | "closed" | "scheduled", blackout = false, kind: "knesset" | "referendum" = "knesset") => ({ status, blackout, kind } as never);
  it("maps status", () => {
    expect(pollChip(p("open")).key).toBe("m_stOpen");
    expect(pollChip(p("closed")).key).toBe("m_stClosed");
    expect(pollChip(p("scheduled")).key).toBe("m_stScheduled");
  });
  it("§16ה blackout freezes election polls but not referendums", () => {
    expect(pollChip(p("open", true)).key).toBe("m_stFrozen");
    expect(canVote(p("open", true), true)).toBe(false);
    expect(canVote(p("open", true, "referendum"), true)).toBe(true);
  });
  it("needs sign-in and open status", () => {
    expect(canVote(p("open"), false)).toBe(false);
    expect(canVote(p("closed"), true)).toBe(false);
    expect(canVote(p("open"), true)).toBe(true);
  });
  it("every chip key exists in he and en", () => {
    for (const k of ["m_stOpen", "m_stClosed", "m_stScheduled", "m_stFrozen"] as const) { expect(DICTS.he[k]).toBeTruthy(); expect(DICTS.en[k]).toBeTruthy(); }
  });
});

describe("results chart rows", () => {
  const opts = [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }];
  it("sorts desc, flags a unique leader, clamps", () => {
    const r = chartRows(opts, { a: 20, b: 70, c: 140 });
    expect(r.map((x) => x.id)).toEqual(["c", "b", "a"]);
    expect(r[0].pct).toBe(100); expect(r[0].leader).toBe(true); expect(r[1].leader).toBe(false);
  });
  it("never invents options the API did not publish (suppressed small cells stay hidden)", () => {
    expect(chartRows(opts, { a: 55 }).map((x) => x.id)).toEqual(["a"]);
    expect(chartRows(opts, undefined)).toEqual([]);
    expect(chartRows(opts, { a: Number.NaN })).toEqual([]);
  });
  it("no leader on a tie", () => {
    expect(chartRows(opts, { a: 50, b: 50 }).some((x) => x.leader)).toBe(false);
  });
  it("blackout wins over published results (§16ה)", () => {
    expect(resultsState({ published: true, blackout: true })).toBe("blackout");
    expect(resultsState({ published: false })).toBe("belowK");
  });
});
