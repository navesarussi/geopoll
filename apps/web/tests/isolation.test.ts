import { describe, it, expect } from "vitest";
import { postgresDb, migrate } from "@/db";
import { connectStores } from "@/lib/store";

// Runs only against a real Postgres (CI / local dev-db): proves zone roles cannot cross schemas.
const url = process.env.TEST_DATABASE_URL;
const zoneUrl = (role: string) => {
  const u = new URL(url!); u.username = role; u.password = "test-zone-pw"; return u.toString();
};
describe.skipIf(!url)("DB-level zone isolation", () => {
  it("each zone role can use only its own schema", async () => {
    const owner = await postgresDb(url!);
    await owner.q("drop schema if exists zone_a, zone_b, zone_c cascade");
    await owner.q("drop table if exists public.schema_migrations");
    await migrate(owner);
    for (const z of ["a", "b", "c"]) await owner.q(`alter role gp_zone_${z} login password 'test-zone-pw'`);
    const s = await connectStores({ DATABASE_URL_ZONE_A: zoneUrl("gp_zone_a"), DATABASE_URL_ZONE_B: zoneUrl("gp_zone_b"), DATABASE_URL_ZONE_C: zoneUrl("gp_zone_c") } as unknown as NodeJS.ProcessEnv);
    expect(s.isolated).toBe(true);
    expect(await s.identity.claimIssuance("h", "2026-10")).toBe(true);
    await s.ballots.enqueue("p", "n1", "yes", "2026-10");
    await s.ballots.flush();
    expect(await s.ballots.tally("p")).toEqual({ yes: 1 });
    const zb = await postgresDb(zoneUrl("gp_zone_b"));
    await expect(zb.q("select * from zone_a.token_issuance")).rejects.toThrow(/permission denied/);
    await expect(zb.q("select * from zone_c.posts")).rejects.toThrow(/permission denied/);
    const za = await postgresDb(zoneUrl("gp_zone_a"));
    await expect(za.q("select * from zone_b.ballots")).rejects.toThrow(/permission denied/);
    const zc = await postgresDb(zoneUrl("gp_zone_c"));
    await expect(zc.q("select * from zone_a.token_issuance")).rejects.toThrow(/permission denied/);
  });
});
