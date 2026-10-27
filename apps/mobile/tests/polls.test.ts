import { describe, it, expect } from "vitest";
import { loadConfig } from "@geopoll/config";
import { fetchPolls } from "../src/core/polls";
import type { Http } from "../src/core/types";

const cfg = loadConfig("IL");
describe("fetchPolls", () => {
  it("uses the server list (incl. admin polls + status)", async () => {
    const extra = { ...cfg.polls[1], id: "admin-1", status: "closed", blackout: false };
    const http: Http = async () => ({ status: 200, json: { polls: [{ ...cfg.polls[0], status: "open", blackout: false }, extra] } });
    const r = await fetchPolls(http, cfg.polls);
    expect(r.live).toBe(true);
    expect(r.polls.map((p) => p.id)).toEqual([cfg.polls[0].id, "admin-1"]);
    expect(r.polls[1].status).toBe("closed");
  });
  it("drops malformed entries and falls back offline", async () => {
    const bad: Http = async () => ({ status: 200, json: { polls: [{ id: "x" }] } });
    expect((await fetchPolls(bad, cfg.polls)).live).toBe(false);
    const off: Http = async () => { throw new Error("offline"); };
    const r = await fetchPolls(off, cfg.polls);
    expect(r.live).toBe(false);
    expect(r.polls.length).toBe(cfg.polls.length);
  });
});

import { resultsState } from "../src/core/polls";
describe("resultsState (regression: blackout shown as below-k)", () => {
  it("blackout wins over unpublished", () => {
    expect(resultsState({ published: false, blackout: true })).toBe("blackout");
    expect(resultsState({ published: false })).toBe("belowK");
    expect(resultsState({ published: true })).toBe("published");
    expect(resultsState(null)).toBe("loading");
  });
});
