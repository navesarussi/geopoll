import { describe, it, expect, afterEach } from "vitest";
import { freshStores } from "./helpers";
import { results, seedDummy, snapshotBeforeWindow } from "@/lib/service";
import { KNESSET_POLL } from "@/lib/poll";
import { config } from "@/lib/config";

afterEach(() => { delete process.env.GEOPOLL_ELECTIONS; });

describe("#77 blackout UI", () => {
  it("flag is OFF by default (pending lawyer K7) → no numbers during blackout", async () => {
    expect(config().features.blackoutShowStale).toBe(false);
    const s = await freshStores();
    await seedDummy(s.ballots, 120, KNESSET_POLL.id);
    await results(s.ballots, new Date("2026-10-20T12:00:00+02:00"), KNESSET_POLL.id); // pre-window snapshot
    process.env.GEOPOLL_ELECTIONS = "2026-10-27";
    const r = await results(s.ballots, new Date("2026-10-25T12:00:00+02:00"), KNESSET_POLL.id);
    expect(r).toMatchObject({ blackout: true, published: false, percents: null });
    expect(r.stale).toBeUndefined();
  });
  it("only snapshots strictly before the window qualify as stale", () => {
    // election Tue 2026-10-27 → window starts Sat 2026-10-24 (after Friday)
    expect(snapshotBeforeWindow("2026-10-23T20:00:00Z", "2026-10-27")).toBe(true);
    expect(snapshotBeforeWindow("2026-10-23T22:30:00Z", "2026-10-27")).toBe(false); // 00:30 Sat Israel time
  });
});
