import postgres from "postgres";
import type { Tally, PublicResults } from "./results";

/**
 * Two logically separate stores with NO shared key (AGENTS.md §2.1):
 *  - IdentityStore (zone A): which account-hash already got a token for an epoch.
 *  - BallotStore (zone B): nullifier -> option. No account, session, IP or exact time.
 * Demo simplification: in one deployment / one DB (separate tables, no FK, no join).
 */
export interface IdentityStore {
  /** Returns true if this is the first issuance for (account, epoch). */
  claimIssuance(accountHash: string, epoch: string): Promise<boolean>;
}
export type UpsertResult = "created" | "replaced";
export interface BallotStore {
  upsert(pollId: string, nullifier: string, option: string, epoch: string): Promise<UpsertResult>;
  tally(pollId: string): Promise<Tally>;
  getSnapshot(pollId: string): Promise<PublicResults | null>;
  saveSnapshot(pollId: string, r: PublicResults): Promise<void>;
}

export class MemoryIdentityStore implements IdentityStore {
  private s = new Set<string>();
  async claimIssuance(a: string, e: string) {
    const k = `${a}|${e}`;
    if (this.s.has(k)) return false;
    this.s.add(k);
    return true;
  }
}
export class MemoryBallotStore implements BallotStore {
  private b = new Map<string, { option: string; pollId: string }>();
  private snaps = new Map<string, PublicResults>();
  async upsert(pollId: string, n: string, option: string) {
    const existed = this.b.has(n);
    this.b.set(n, { option, pollId });
    return existed ? "replaced" : "created";
  }
  async tally(pollId: string) {
    const t: Tally = {};
    for (const v of this.b.values()) if (v.pollId === pollId) t[v.option] = (t[v.option] ?? 0) + 1;
    return t;
  }
  async getSnapshot(p: string) { return this.snaps.get(p) ?? null; }
  async saveSnapshot(p: string, r: PublicResults) { this.snaps.set(p, r); }
}

class PgStores implements IdentityStore, BallotStore {
  private ready: Promise<unknown>;
  constructor(private sql: postgres.Sql) {
    this.ready = sql.begin(async (tx) => {
      await tx`create table if not exists zone_a_token_issuance (account_hash text not null, epoch text not null, primary key (account_hash, epoch))`;
      await tx`create table if not exists zone_b_ballots (nullifier text primary key, poll_id text not null, option_id text not null, epoch text not null)`;
      await tx`create table if not exists zone_b_snapshots (poll_id text primary key, body jsonb not null)`;
    });
  }
  async claimIssuance(a: string, e: string) {
    await this.ready;
    const r = await this.sql`insert into zone_a_token_issuance values (${a}, ${e}) on conflict do nothing returning 1`;
    return r.length === 1;
  }
  async upsert(pollId: string, n: string, option: string, epoch: string) {
    await this.ready;
    const r = await this.sql`insert into zone_b_ballots values (${n}, ${pollId}, ${option}, ${epoch})
      on conflict (nullifier) do update set option_id = excluded.option_id returning (xmax = 0) as inserted`;
    return r[0].inserted ? "created" : "replaced";
  }
  async tally(pollId: string) {
    await this.ready;
    const rows = await this.sql`select option_id, count(*)::int as c from zone_b_ballots where poll_id = ${pollId} group by option_id`;
    const t: Tally = {};
    for (const r of rows) t[r.option_id] = r.c;
    return t;
  }
  async getSnapshot(p: string) {
    await this.ready;
    const r = await this.sql`select body from zone_b_snapshots where poll_id = ${p}`;
    return r.length ? (r[0].body as PublicResults) : null;
  }
  async saveSnapshot(p: string, body: PublicResults) {
    await this.ready;
    await this.sql`insert into zone_b_snapshots values (${p}, ${this.sql.json(body as never)}) on conflict (poll_id) do update set body = excluded.body`;
  }
}

type G = { __gp?: { identity: IdentityStore; ballots: BallotStore; seeded?: boolean } };
export function stores() {
  const g = globalThis as G;
  if (!g.__gp) {
    if (process.env.DATABASE_URL) {
      const pg = new PgStores(postgres(process.env.DATABASE_URL, { ssl: "require", max: 2, prepare: false }));
      g.__gp = { identity: pg, ballots: pg };
    } else {
      g.__gp = { identity: new MemoryIdentityStore(), ballots: new MemoryBallotStore() };
    }
  }
  return g.__gp;
}
