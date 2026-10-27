import { describe, it, expect, afterEach } from "vitest";
import { results, runBatch } from "@/lib/service";
import { DEMO_POLL } from "@/lib/poll";
import { freshStores } from "./helpers";
import { GET } from "@/app/api/cron/batch/route";

afterEach(() => { delete process.env.BATCH_MODE; delete process.env.CRON_SECRET; });

describe("scheduled batching", () => {
  it("in scheduled mode user requests never flush; only runBatch does", async () => {
    process.env.BATCH_MODE = "scheduled";
    const { ballots } = await freshStores();
    for (let i = 0; i < 60; i++) await ballots.enqueue(DEMO_POLL.id, String(i).padStart(64, "0"), "yes", "2026-10");
    const r1 = await results(ballots);
    expect(r1.published).toBe(false);
    const b = await runBatch(ballots);
    expect(b.flushed).toBe(60);
    const r2 = await results(ballots);
    expect(r2.published).toBe(true);
    expect(r2.percents!.yes).toBe(100);
  });
  it("cron endpoint requires the bearer secret", async () => {
    expect((await GET(new Request("http://x/api/cron/batch"))).status).toBe(401);
    process.env.CRON_SECRET = "s3cret-value";
    expect((await GET(new Request("http://x/api/cron/batch", { headers: { authorization: "Bearer wrong" } }))).status).toBe(401);
  });
});
