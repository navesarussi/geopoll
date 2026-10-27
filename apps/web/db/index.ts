import m001 from "./migrations/001_zones";
import m002 from "./migrations/002_roles";
import m003 from "./migrations/003_default_privileges";
import m004 from "./migrations/004_ballot_tier";

export const MIGRATIONS: [string, string][] = [["001_zones", m001], ["002_roles", m002], ["003_default_privileges", m003], ["004_ballot_tier", m004]];

/** Minimal adapter so the same SQL runs on Postgres (postgres.js) and PGlite (tests / no-DB fallback). */
export interface Db {
  q<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  kind: "postgres" | "pglite";
}

export async function migrate(db: Db) {
  await db.q(`create table if not exists public.schema_migrations (id text primary key, applied_at timestamptz default now())`);
  for (const [id, sql] of MIGRATIONS) {
    const done = await db.q(`select 1 from public.schema_migrations where id = $1`, [id]);
    if (done.length) continue;
    await db.tx(async (t) => {
      for (const stmt of splitSql(sql)) await t.q(stmt);
      await t.q(`insert into public.schema_migrations (id) values ($1)`, [id]);
    });
  }
}

/** Split on top-level semicolons (respects $$ blocks). */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let cur = "", dollar = false;
  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--") && !dollar) continue;
    const code = dollar ? line : line.replace(/\s+--\s.*$/, "");
    cur += code + "\n";
    if ((line.match(/\$\$/g) ?? []).length % 2 === 1) dollar = !dollar;
    if (!dollar && code.trimEnd().endsWith(";")) { out.push(cur.trim()); cur = ""; }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export async function postgresDb(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { ssl: /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("sslmode=disable") ? false : "require", max: 3, prepare: false, onnotice: () => {} });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrap = (s: any): Db => ({
    kind: "postgres",
    q: (text, params = []) => s.unsafe(text, params as never[]) as never,
    tx: (fn) => (sql.begin((t) => fn(wrap(t))) as unknown as Promise<never>),
  });
  return wrap(sql);
}

export async function pgliteDb(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wrap = (s: any): Db => ({
    kind: "pglite",
    q: async (text, params = []) => (await s.query(text, params)).rows as never,
    tx: (fn) => pg.transaction((t) => fn(wrap(t as never))) as Promise<never>,
  });
  return wrap(pg);
}
