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
  async enqueue(pollId: string, nullifier: string, option: string, epoch: string, tier = "T0"): Promise<"created" | "replaced"> {
    const prior = await this.db.q(
      `select 1 from zone_b.ballots where nullifier=$1 union all select 1 from zone_b.ballot_queue where nullifier=$1 limit 1`, [nullifier]);
    await this.db.q(`insert into zone_b.ballot_queue (nullifier, poll_id, option_id, epoch, tier) values ($1,$2,$3,$4,$5)`, [nullifier, pollId, option, epoch, tier]);
    return prior.length ? "replaced" : "created";
  }
  /** Moves the queue into ballots (last queued choice per nullifier wins), then empties the queue. */
  async flush(now = new Date()): Promise<number> {
    return this.db.tx(async (t) => {
      const rows = await t.q<{ n: number }>(`with q as (
          delete from zone_b.ballot_queue returning seq, nullifier, poll_id, option_id, epoch, tier),
        last as (select distinct on (nullifier) nullifier, poll_id, option_id, epoch, tier from q order by nullifier, seq desc),
        up as (insert into zone_b.ballots (nullifier, poll_id, option_id, epoch, day_bucket, tier) select nullifier, poll_id, option_id, epoch, $1::date, tier from last
          on conflict (nullifier) do update set option_id = excluded.option_id, day_bucket = excluded.day_bucket, tier = excluded.tier returning 1)
        select count(*)::int as n from up`, [now.toISOString().slice(0, 10)]);
      await t.q(`insert into zone_b.meta values ('last_flush',$1) on conflict (k) do update set v = excluded.v`, [now.toISOString()]);
      return rows[0]?.n ?? 0;
    });
  }
  /** Device-side inclusion check (T-207): status only, NEVER the choice (no transferable receipt). */
  async status(nullifier: string): Promise<"counted" | "queued" | "not_found"> {
    const q = await this.db.q(`select 1 from zone_b.ballot_queue where nullifier=$1 limit 1`, [nullifier]);
    if (q.length) return "queued";
    const b = await this.db.q(`select 1 from zone_b.ballots where nullifier=$1`, [nullifier]);
    return b.length ? "counted" : "not_found";
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
  /** Distinct tiers among counted ballots (for the "basic assurance" label). */
  async tiers(pollId: string): Promise<string[]> {
    const r = await this.db.q<{ tier: string }>(`select distinct tier from zone_b.ballots where poll_id=$1`, [pollId]);
    return r.map((x) => x.tier).sort();
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
    await this.db.q(`insert into zone_b.ballots (nullifier, poll_id, option_id, epoch, day_bucket) select n, $2, o, e, $3::date from
      unnest($1::text[], $4::text[], $5::text[]) as x(n,o,e) on conflict do nothing`,
      [items.map((i) => i.nullifier), pollId, day, items.map((i) => i.option), items.map((i) => i.epoch)]);
  }
}

export interface Post {
  id: number; parent_id: number | null; display_name: string; option_id: string | null;
  body: string; created_at: string; deleted: boolean; mine?: boolean;
  anon: boolean; pid: string | null; avatar: string | null;
}
export interface Profile { pid: string; display_name: string; bio: string; avatar: string; is_minor: boolean | null; consented: boolean }

/**
 * Zone C. "Author keys" = the set of hashes a viewer owns: [profileHash, anonHash(poll)].
 * Non-anon posts: author_hash = profileHash (public link to the profile, by user choice/default).
 * Anon posts: author_hash = anonHash = HMAC(ANON_HMAC_KEY, account|poll): no join to profiles without that key.
 */
export class ContentStore {
  constructor(private db: Db) {}
  async countRecent(keys: string[], seconds: number): Promise<number> {
    const r = await this.db.q<{ c: number }>(
      `select count(*)::int c from zone_c.posts where author_hash = any($1::text[]) and created_at > now() - make_interval(secs => $2)`, [keys, seconds]);
    return r[0].c;
  }
  async hasPosition(pollId: string, keys: string[]): Promise<boolean> {
    const r = await this.db.q(`select 1 from zone_c.posts where poll_id=$1 and author_hash = any($2::text[]) and parent_id is null and not deleted`, [pollId, keys]);
    return r.length > 0;
  }
  async parentExists(pollId: string, id: number): Promise<boolean> {
    const r = await this.db.q(`select 1 from zone_c.posts where id=$1 and poll_id=$2 and not deleted`, [id, pollId]);
    return r.length > 0;
  }
  async create(p: { pollId: string; parentId: number | null; authorHash: string; displayName: string; option: string | null; body: string; anon?: boolean; modSeal?: string | null }) {
    const r = await this.db.q<{ id: number }>(
      `insert into zone_c.posts (poll_id,parent_id,author_hash,display_name,option_id,body,anon,mod_seal) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
      [p.pollId, p.parentId, p.authorHash, p.displayName, p.option, p.body, !!p.anon, p.modSeal ?? null]);
    return Number(r[0].id);
  }
  private shape(rows: (Post & { author_hash: string; p_name: string | null })[], viewerKeys: string[]): Post[] {
    return rows.map(({ author_hash, p_name, ...p }) => ({
      ...p, id: Number(p.id), parent_id: p.parent_id == null ? null : Number(p.parent_id),
      body: p.deleted ? "" : p.body, option_id: p.deleted ? null : p.option_id,
      display_name: p.deleted ? "" : (p.anon ? p.display_name : p_name ?? p.display_name),
      pid: p.deleted || p.anon ? null : p.pid, avatar: p.deleted || p.anon ? null : p.avatar,
      mine: viewerKeys.includes(author_hash), created_at: new Date(p.created_at).toISOString(),
    }));
  }
  async list(pollId: string, viewerKeys: string[] = []): Promise<Post[]> {
    const rows = await this.db.q<Post & { author_hash: string; p_name: string | null }>(
      `select x.id, x.parent_id, x.display_name, x.option_id, x.body, x.created_at, x.deleted, x.anon, x.author_hash,
              case when x.anon then null else pr.pid end as pid, case when x.anon then null else pr.avatar end as avatar,
              case when x.anon then null else pr.display_name end as p_name
       from zone_c.posts x left join zone_c.profiles pr on (not x.anon and pr.profile_hash = x.author_hash)
       where x.poll_id=$1 and x.report_count < $2 order by x.created_at asc limit 500`, [pollId, HIDE_AFTER_REPORTS]);
    return this.shape(rows, viewerKeys);
  }
  async positionCounts(pollId: string): Promise<Tally> {
    const rows = await this.db.q<{ option_id: string; c: number }>(
      `select option_id, count(*)::int c from zone_c.posts where poll_id=$1 and parent_id is null and not deleted and option_id is not null and report_count < $2 group by option_id`,
      [pollId, HIDE_AFTER_REPORTS]);
    return Object.fromEntries(rows.map((r) => [r.option_id, r.c]));
  }
  async deleteOwn(id: number, keys: string[]): Promise<boolean> {
    const r = await this.db.q(`update zone_c.posts set deleted=true where id=$1 and author_hash = any($2::text[]) and not deleted returning 1`, [id, keys]);
    return r.length === 1;
  }
  async report(id: number, reporterHash: string): Promise<boolean> {
    return this.db.tx(async (t) => {
      const r = await t.q(`insert into zone_c.reports (post_id, reporter_hash) select $1,$2 where exists (select 1 from zone_c.posts where id=$1) on conflict do nothing returning 1`, [id, reporterHash]);
      if (r.length) await t.q(`update zone_c.posts set report_count = report_count + 1 where id=$1`, [id]);
      return r.length === 1;
    });
  }
  async pollOf(id: number): Promise<string | null> {
    const r = await this.db.q<{ poll_id: string }>(`select poll_id from zone_c.posts where id=$1`, [id]);
    return r[0]?.poll_id ?? null;
  }
  // ---- profiles ----
  async getProfile(profileHash: string): Promise<Profile | null> {
    const r = await this.db.q<Profile & { consented_at: string | null }>(
      `select pid, display_name, bio, avatar, is_minor, consented_at from zone_c.profiles where profile_hash=$1`, [profileHash]);
    return r.length ? { ...r[0], consented: r[0].consented_at != null } : null;
  }
  async upsertProfile(profileHash: string, pid: string, p: { displayName: string; bio: string; avatar: string }): Promise<void> {
    await this.db.q(`insert into zone_c.profiles (profile_hash,pid,display_name,bio,avatar) values ($1,$2,$3,$4,$5)
      on conflict (profile_hash) do update set display_name=excluded.display_name, bio=excluded.bio, avatar=excluded.avatar, updated_at=now()`,
      [profileHash, pid, p.displayName, p.bio, p.avatar]);
  }
  async consent(profileHash: string): Promise<void> {
    await this.db.q(`update zone_c.profiles set consented_at = coalesce(consented_at, now()) where profile_hash=$1`, [profileHash]);
  }
  /** Public profile page: ONLY non-anonymous, non-deleted, non-hidden posts. */
  async publicProfile(pid: string): Promise<{ profile: Omit<Profile, "is_minor" | "consented">; posts: (Post & { poll_id: string })[] } | null> {
    const pr = await this.db.q<{ profile_hash: string; pid: string; display_name: string; bio: string; avatar: string }>(
      `select profile_hash, pid, display_name, bio, avatar from zone_c.profiles where pid=$1`, [pid]);
    if (!pr.length) return null;
    const rows = await this.db.q<Post & { author_hash: string; p_name: string | null; poll_id: string }>(
      `select id, parent_id, display_name, option_id, body, created_at, deleted, anon, author_hash, poll_id, null as p_name, $2::text as pid, $3::text as avatar
       from zone_c.posts where author_hash=$1 and not anon and not deleted and report_count < $4 order by created_at desc limit 100`,
      [pr[0].profile_hash, pr[0].pid, pr[0].avatar, HIDE_AFTER_REPORTS]);
    const { profile_hash: _h, ...profile } = pr[0];
    void _h;
    return { profile, posts: this.shape(rows, []).map((p, i) => ({ ...p, display_name: profile.display_name, poll_id: rows[i].poll_id })) };
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
 *    The owner URL is NOT used at runtime (unless MIGRATE_ON_START=1); apply migrations with `npm run migrate`.
 *  - only DATABASE_URL / POSTGRES_URL: one owner connection for all zones (demo simplification).
 *  - nothing: in-memory PGlite.
 */
export async function connectStores(env = process.env): Promise<Stores> {
  const a = env.DATABASE_URL_ZONE_A, b = env.DATABASE_URL_ZONE_B, c = env.DATABASE_URL_ZONE_C;
  const owner = env.DATABASE_URL ?? env.POSTGRES_URL;
  if (a || b || c) {
    if (!(a && b && c)) throw new Error("set all of DATABASE_URL_ZONE_A/B/C or none");
    // Owner credentials are for migrations only: used at runtime ONLY if MIGRATE_ON_START=1 (dev). Otherwise run `npm run migrate`.
    if (owner && env.MIGRATE_ON_START === "1") await migrate(await postgresDb(owner));
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
