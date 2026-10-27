import { makeStores } from "@/lib/store";
import { pgliteDb, postgresDb } from "@/db";

export const freshStores = async () => {
  const url = process.env.TEST_DATABASE_URL;
  const db = url ? await postgresDb(url) : await pgliteDb();
  if (url) await db.q("drop schema if exists zone_a, zone_b, zone_c cascade");
  if (url) await db.q("drop table if exists public.schema_migrations");
  return makeStores(db);
};
