import { describe, it, expect, beforeEach, vi } from "vitest";
import { freshStores } from "./helpers";
import { parseOptions, savePoll } from "@/lib/polls";
import { setDbPolls } from "@/lib/config";
import type { Stores } from "@/lib/store";

let s: Stores;
vi.mock("@/lib/store", async (orig) => ({ ...(await orig<typeof import("@/lib/store")>()), stores: () => Promise.resolve(s) }));
beforeEach(async () => { s = await freshStores(); setDbPolls([]); });

describe("GET /api/polls", () => {
  it("lists config + admin polls with effective status, no counts", async () => {
    await savePoll(s, "a", { id: "api-1", kind: "referendum", question: { he: "ש?" }, options: parseOptions("y | כן\nn | לא") }, null);
    const { GET } = await import("@/app/api/polls/route");
    const j = await (await GET()).json();
    const ids = j.polls.map((p: { id: string }) => p.id);
    expect(ids).toContain("api-1");
    expect(ids.length).toBeGreaterThanOrEqual(3);
    const a = j.polls.find((p: { id: string }) => p.id === "api-1");
    expect(a.status).toBe("closed");
    expect(JSON.stringify(j)).not.toMatch(/nullifier|tally|counted/);
  });
});
