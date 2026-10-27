import { migrate, pgliteDb, postgresDb, type Db } from "@/db";
import type { PublicResults, Tally } from "./results";

/**
 * Zone stores. Each class touches ONLY its own schema; there is no query, type or id joining zones
 * (AGENTS.md §2.1). Demo simplification: one DB connection string unless DATABASE_URL_ZONE_* are set.
 */
export class IdentityStore {
  constructor(private db: Db) {}
  /** true on first issuance for (account, epoch). */
  async claimIssuance(accountHash: string, epoch: string): Promise<boolean> {
    const r = await this.db.q(`insert into zone_a.token_issuance values ($1,$2) on conflict do nothing returning 1`, [accountHash, epoch]);
    return r.length === 1;
  }
}

export class BallotStore {
  constructor(private db: Db) {}
  /** Enqueue only; counted after the next flush. Returns whether this nullifier already voted (revote). */
  async enqueue(pollId: string, nullifier: string, option: string, epoch: string): Promise<"created" | "replaced"> {
    const prior = await this.db.q(
      `select 1 from zone_b.ballots where nullifier=$1 union all select 1 from zone_b.ballot_queue where nullifier=$1 limit 1`, [nullifier]);
    await this.db.q(`insert into zone_b.ballot_queue (nullifier, poll_id, option_id, epoch) values ($1,$2,$3,$4)`, [nullifier, pollId, option, epoch]);
    return prior.length ? "replaced" : "created";
  }
  /** Moves the queue into ballots (last queued choice per nullifier wins), then empties the queue. */
  async flush(now = new Date()): Promise<number> {
    return this.db.tx(async (t) => {
      const rows = await t.q<{ n: number }>(`with q as (
          delete from zone_b.ballot_queue returning seq, nullifier, poll_id, option_id, epoch),
        last as (select distinct on (nullifier) nullifier, poll_id, option_id, epoch from q order by nullifier, seq desc),
        up as (insert into zone_b.ballots select nullifier, poll_id, option_id, epoch, $1::date from last
          on conflict (nullifier) do update set option_id = excluded.option_id, day_bucket = excluded.day_bucket returning 1)
        select count(*)::int as n from up`, [now.toISOString().slice(0, 10)]);
      await t.q(`insert into zone_b.meta values ('last_flush',$1) on conflict (k) do update set v = excluded.v`, [now.toISOString()]);
      return rows[0]?.n ?? 0;
    });
  }
  async lastFlush(): Promise<Date | null> {
    const r = await this.db.q<{ v: string }>(`select v from zone_b.meta where k='last_flush'`);
    return r.length ? new Date(r[0].v) : null;
  }
  async tally(pollId: string): Promise<Tally> {
    const rows = await this.db.q<{ option_id: string; c: number }>(
      `select option_id, count(*)::int as c from zone_b.ballots where poll_id=$1 group by option_id`, [pollId]);
    return Object.fromEntries(rows.map((r) => [r.option_id, r.c]));
  }
  async getSnapshot(pollId: string): Promise<PublicResults | null> {
    const r = await this.db.q<{ body: PublicResults | string }>(`select body from zone_b.snapshots where poll_id=$1`, [pollId]);
    if (!r.length) return null;
    return typeof r[0].body === "string" ? JSON.parse(r[0].body) : r[0].body;
  }
  async saveSnapshot(pollId: string, body: PublicResults) {
    await this.db.q(`insert into zone_b.snapshots values ($1,$2::jsonb) on conflict (poll_id) do update set body=excluded.body`, [pollId, JSON.stringify(body)]);
  }
  /** Dummy ballots ("seed-" nullifiers), idempotent. */
  async seed(pollId: string, items: { nullifier: string; option: string; epoch: string }[]) {
    if (!items.length) return;
    const day = new Date().toISOString().slice(0, 10);
    await this.db.q(`insert into zone_b.ballots select n, $2, o, e, $3::date from
      unnest($1::text[], $4::text[], $5::text[]) as x(n,o,e) on conflict do nothing`,
      [items.map((i) => i.nullifier), pollId, day, items.map((i) => i.option), items.map((i) => i.epoch)]);
  }
}

export interface Post {
  id: number; parent_id: number | null; display_name: string; option_id: string | null;
  body: string; created_at: string; deleted: boolean; mine?: boolean;
}

export class ContentStore {
  constructor(private db: Db) {}
  async countRecent(authorHash: string, seconds: number): Promise<number> {
    const r = await this.db.q<{ c: number }>(
      `select count(*)::int c from zone_c.posts where author_hash=$1 and created_at > now() - make_interval(secs => $2)`, [authorHash, seconds]);
    return r[0].c;
  }
  async hasPosition(pollId: string, authorHash: string): Promise<boolean> {
    const r = await this.db.q(`select 1 from zone_c.posts where poll_id=$1 and author_hash=$2 and parent_id is null and not deleted`, [pollId, authorHash]);
    return r.length > 0;
  }
  async parentExists(pollId: string, id: number): Promise<boolean> {
    const r = await this.db.q(`select 1 from zone_c.posts where id=$1 and poll_id=$2 and not deleted`, [id, pollId]);
    return r.length > 0;
  }
  async create(p: { pollId: string; parentId: number | null; authorHash: string; displayName: string; option: string | null; body: string }) {
    const r = await this.db.q<{ id: number }>(
      `insert into zone_c.posts (poll_id,parent_id,author_hash,display_name,option_id,body) values ($1,$2,$3,$4,$5,$6) returning id`,
      [p.pollId, p.parentId, p.authorHash, p.displayName, p.option, p.body]);
    return Number(r[0].id);
  }
  async list(pollId: string, viewerHash: string | null): Promise<Post[]> {
    const rows = await this.db.q<Post & { author_hash: string }>(
      `select id, parent_id, display_name, option_id, body, created_at, deleted, author_hash
       from zone_c.posts where poll_id=$1 and report_count < $2 order by created_at asc limit 500`, [pollId, HIDE_AFTER_REPORTS]);
    return rows.map(({ author_hash, ...p }) => ({
      ...p, id: Number(p.id), parent_id: p.parent_id == null ? null : Number(p.parent_id),
      body: p.deleted ? "" : p.body, option_id: p.deleted ? null : p.option_id,
      display_name: p.deleted ? "" : p.display_name, mine: viewerHash != null && author_hash === viewerHash,
      created_at: new Date(p.created_at).toISOString(),
    }));
  }
  async positionCounts(pollId: string): Promise<Tally> {
    const rows = await this.db.q<{ option_id: string; c: number }>(
      `select option_id, count(*)::int c from zone_c.posts where poll_id=$1 and parent_id is null and not deleted and option_id is not null and report_count < $2 group by option_id`,
      [pollId, HIDE_AFTER_REPORTS]);
    return Object.fromEntries(rows.map((r) => [r.option_id, r.c]));
  }
  async deleteOwn(id: number, authorHash: string): Promise<boolean> {
    const r = await this.db.q(`update zone_c.posts set deleted=true where id=$1 and author_hash=$2 and not deleted returning 1`, [id, authorHash]);
    return r.length === 1;
  }
  async report(id: number, reporterHash: string): Promise<boolean> {
    return this.db.tx(async (t) => {
      const r = await t.q(`insert into zone_c.reports (post_id, reporter_hash) select $1,$2 where exists (select 1 from zone_c.posts where id=$1) on conflict do nothing returning 1`, [id, reporterHash]);
      if (r.length) await t.q(`update zone_c.posts set report_count = report_count + 1 where id=$1`, [id]);
      return r.length === 1;
    });
  }
}
/** Demo moderation: posts with this many distinct reports are hidden pending review. */
export const HIDE_AFTER_REPORTS = 3;

export interface Stores { identity: IdentityStore; ballots: BallotStore; content: ContentStore; kind: Db["kind"]; isolated?: boolean }

export async function makeStores(db: Db): Promise<Stores> {
  await migrate(db);
  return { identity: new IdentityStore(db), ballots: new BallotStore(db), content: new ContentStore(db), kind: db.kind };
}

type G = { __gp?: Promise<Stores> };

/**
 * Connection modes:
 *  - DATABASE_URL_ZONE_A/B/C set: each zone store gets its OWN connection as role gp_zone_a/b/c,
 *    which the DB only allows to touch its own schema (real isolation at DB level).
 *    Migrations run with DATABASE_URL (owner) if given; otherwise they must be applied beforehand (scripts/dev-db).
 *  - only DATABASE_URL / POSTGRES_URL: one owner connection for all zones (demo simplification).
 *  - nothing: in-memory PGlite.
 */
export async function connectStores(env = process.env): Promise<Stores> {
  const a = env.DATABASE_URL_ZONE_A, b = env.DATABASE_URL_ZONE_B, c = env.DATABASE_URL_ZONE_C;
  const owner = env.DATABASE_URL ?? env.POSTGRES_URL;
  if (a || b || c) {
    if (!(a && b && c)) throw new Error("set all of DATABASE_URL_ZONE_A/B/C or none");
    if (owner) await migrate(await postgresDb(owner));
    const [da, db, dc] = await Promise.all([postgresDb(a), postgresDb(b), postgresDb(c)]);
    return { identity: new IdentityStore(da), ballots: new BallotStore(db), content: new ContentStore(dc), kind: "postgres", isolated: true };
  }
  return makeStores(owner ? await postgresDb(owner) : await pgliteDb());
}

export function stores(): Promise<Stores> {
  const g = globalThis as G;
  if (!g.__gp) {
    g.__gp = connectStores();
    g.__gp.catch(() => { g.__gp = undefined; });
  }
  return g.__gp;
}
