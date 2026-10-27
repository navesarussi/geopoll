/**
 * T-111 (#43): synthetic dummy-data generator. DUMMY DATA ONLY — never real people.
 * Deterministic (seeded PRNG) so tests and demos are reproducible.
 * Distributions are working assumptions (**הנחה**), to be replaced by census 2022 / Knesset results
 * (see docs/research data-sources) — do not present them as facts.
 */
export type Tier = "T0" | "T1" | "T2" | "T3";
export interface DummyUser { accountId: string; tier: Tier; ageBucket: string; district: string }
export type DummyAction =
  | { kind: "vote"; user: number; option: string }
  | { kind: "revote"; user: number; option: string }
  | { kind: "double_issue"; user: number }       // tries to get a 2nd token in the same epoch
  | { kind: "forged_token"; option: string }     // attacker without a valid signature
  | { kind: "wrong_epoch"; user: number; option: string };
export interface Scenario { seed: number; users: DummyUser[]; actions: DummyAction[] }

/** mulberry32 — NOT for security, only for reproducible dummy data. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function pick<T>(r: () => number, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) { if ((x -= w) < 0) return v; }
  return items[items.length - 1][0];
}

// **הנחה:** rough shares, adults 18+.
export const AGE = [["18-24", 13], ["25-34", 18], ["35-44", 17], ["45-54", 15], ["55-64", 13], ["65+", 24]] as const;
export const DISTRICT = [["ירושלים", 13], ["צפון", 15], ["חיפה", 12], ["מרכז", 25], ["תל אביב", 15], ["דרום", 15], ["יהודה ושומרון", 5]] as const;
export const TIERS = [["T0", 70], ["T1", 25], ["T2", 5], ["T3", 0]] as const;

export interface GenOptions {
  seed?: number; users?: number;
  options: readonly string[]; optionWeights?: readonly number[];
  turnout?: number; revoteRate?: number; doubleIssueRate?: number; forged?: number; wrongEpoch?: number;
}

export function generate(o: GenOptions): Scenario {
  const seed = o.seed ?? 42, n = o.users ?? 200, r = prng(seed);
  const w = o.optionWeights ?? o.options.map(() => 1);
  const opts = o.options.map((v, i) => [v, w[i]] as const);
  const users: DummyUser[] = Array.from({ length: n }, (_, i) => ({
    accountId: `dummy:${seed}:${i}`, tier: pick(r, TIERS), ageBucket: pick(r, AGE), district: pick(r, DISTRICT),
  }));
  const actions: DummyAction[] = [];
  users.forEach((_, i) => {
    if (r() >= (o.turnout ?? 0.8)) return;
    actions.push({ kind: "vote", user: i, option: pick(r, opts) });
    if (r() < (o.revoteRate ?? 0.1)) actions.push({ kind: "revote", user: i, option: pick(r, opts) });
    if (r() < (o.doubleIssueRate ?? 0.05)) actions.push({ kind: "double_issue", user: i });
  });
  for (let i = 0; i < (o.forged ?? 3); i++) actions.push({ kind: "forged_token", option: pick(r, opts) });
  for (let i = 0; i < (o.wrongEpoch ?? 2) && n > 0; i++) actions.push({ kind: "wrong_epoch", user: Math.floor(r() * n), option: pick(r, opts) });
  return { seed, users, actions };
}
