import { describe, expect, it, afterEach } from "vitest";
import { blackoutWindow, ConfigError, isBlackout, loadConfig, merge, validate, base } from "@geopoll/config";
import { toCssVars, tokens } from "@geopoll/design-tokens";
import { DICTS, dirOf, resolveLocale } from "@/lib/i18n";
import { results, runBatch, seedDummy, castVote } from "@/lib/service";
import { KNESSET_POLL, DEMO_POLL } from "@/lib/poll";
import { freshStores } from "./helpers";

describe("packages/config (ADR-0022)", () => {
  it("IL config: Hebrew default, 4 locales, ADR-0012 k values, both poll kinds", () => {
    const c = loadConfig("IL");
    expect(c.jurisdiction.defaultLocale).toBe("he");
    expect(c.jurisdiction.locales).toEqual(["he", "en", "ar", "ru"]);
    expect(c.jurisdiction.thresholds).toMatchObject({ kNational: 50, kSmallLocality: 100 });
    expect(c.jurisdiction.publication).toMatchObject({ batchIntervalSeconds: 3600, snapshotIntervalSeconds: 86400 });
    expect(c.polls.map((p) => p.kind).sort()).toEqual(["knesset-election", "referendum"]);
    expect(KNESSET_POLL.options.length).toBeGreaterThanOrEqual(10);
    expect(DEMO_POLL.options.map((o) => o.id)).toEqual(["yes", "no"]);
  });
  it("env overrides deploy knobs only", () => {
    const c = loadConfig("IL", { BATCH_INTERVAL_SECONDS: "60", NEXT_PUBLIC_RELAY_URL: "https://relay.example", GEOPOLL_ELECTIONS: "2026-11-03", NEXT_PUBLIC_BETA_INCLUSION_CHECK: "0" });
    expect(c.jurisdiction.publication.batchIntervalSeconds).toBe(60);
    expect(c.services.relayUrl).toBe("https://relay.example");
    expect(c.jurisdiction.elections).toEqual([{ type: "knesset", date: "2026-11-03" }]);
    expect(c.features.inclusionCheck).toBe(false);
  });
  it("rejects invalid config", () => {
    expect(() => loadConfig("XX")).toThrow();
    expect(() => validate(merge(base, { jurisdiction: { thresholds: { kNational: 0 } } }))).toThrow(ConfigError);
    expect(() => validate(merge(base, { jurisdiction: { defaultLocale: "ru" } }))).toThrow(ConfigError);
    expect(() => validate(merge(base, { jurisdiction: { publication: { buckets: [50, 100] } } }))).toThrow(ConfigError);
    expect(() => validate(merge(base, { polls: [{ ...DEMO_POLL }, { ...DEMO_POLL }] }))).toThrow(ConfigError);
    expect(() => loadConfig("IL", { GEOPOLL_ELECTIONS: "next tuesday" })).toThrow(ConfigError);
  });
});

describe("§16ה(ח) blackout", () => {
  const j = loadConfig("IL", { GEOPOLL_ELECTIONS: "2026-11-03" }).jurisdiction; // Tuesday
  const at = (iso: string) => new Date(iso);
  it("window = Saturday after the Friday before, until 22:00 on election day (Asia/Jerusalem)", () => {
    expect(blackoutWindow("2026-11-03").startDate).toBe("2026-10-31");
    expect(isBlackout(j, "knesset-election", at("2026-10-30T21:59:00Z")).active).toBe(false); // Fri 23:59 IL
    expect(isBlackout(j, "knesset-election", at("2026-10-30T22:00:00Z")).active).toBe(true); // Sat 00:00 IL
    expect(isBlackout(j, "knesset-election", at("2026-11-03T19:59:00Z")).active).toBe(true); // 21:59 IL
    expect(isBlackout(j, "knesset-election", at("2026-11-03T20:00:00Z")).active).toBe(false); // 22:00 IL
    expect(isBlackout(j, "referendum", at("2026-11-02T10:00:00Z")).active).toBe(false);
  });
  it("Friday election day: window starts the Saturday a week before", () => {
    expect(blackoutWindow("2026-11-06").startDate).toBe("2026-10-31");
  });
});

describe("blackout enforcement in the app", () => {
  const prev = process.env.GEOPOLL_ELECTIONS;
  afterEach(() => { if (prev === undefined) delete process.env.GEOPOLL_ELECTIONS; else process.env.GEOPOLL_ELECTIONS = prev; });
  it("suppresses Knesset results and new snapshots during blackout, not referendum results", async () => {
    const b = (await freshStores()).ballots;
    await seedDummy(b, 200, KNESSET_POLL.id);
    await seedDummy(b, 200, DEMO_POLL.id);
    process.env.GEOPOLL_ELECTIONS = "2026-11-03";
    const inWindow = new Date("2026-11-02T10:00:00Z");
    const r = await results(b, inWindow, KNESSET_POLL.id);
    expect(r).toMatchObject({ published: false, blackout: true, percents: null, participants: "" });
    expect((await results(b, inWindow, DEMO_POLL.id)).published).toBe(true);
    await runBatch(b, inWindow);
    expect(await b.getSnapshot(KNESSET_POLL.id)).toBeNull();
    const vote = await castVote(b, { pollId: KNESSET_POLL.id, option: "mhl", preparedMsg: new Uint8Array(8), signature: new Uint8Array(8) }, inWindow);
    expect(vote).toEqual({ ok: false, error: "blackout" });
    delete process.env.GEOPOLL_ELECTIONS;
    expect((await results(b, inWindow, KNESSET_POLL.id)).published).toBe(true);
  });
});

describe("i18n + tokens", () => {
  it("he default/RTL, en LTR, ar/ru stubs carry every key", () => {
    expect(resolveLocale(undefined, ["he", "en"], "he")).toBe("he");
    expect(resolveLocale("en", ["he", "en"], "he")).toBe("en");
    expect(resolveLocale("fr", ["he", "en"], "he")).toBe("he");
    expect(dirOf("he")).toBe("rtl"); expect(dirOf("ar")).toBe("rtl"); expect(dirOf("en")).toBe("ltr");
    const keys = Object.keys(DICTS.he).sort();
    for (const l of ["en", "ar", "ru"] as const) expect(Object.keys(DICTS[l]).sort()).toEqual(keys);
  });
  it("tokens flatten to CSS vars", () => {
    expect(toCssVars()).toContain(`--gp-color-primary:${tokens.color.primary}`);
    expect(toCssVars()).toContain("--gp-layout-max-width:480px");
  });
});
