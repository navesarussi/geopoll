/**
 * ADR-0022: global configuration layer. Dependency-free runtime validation (so any app/service can import
 * the TS sources directly without installing anything). Values here are the single source of truth.
 */
export type Locale = "he" | "en" | "ar" | "ru";
export const LOCALES: readonly Locale[] = ["he", "en", "ar", "ru"];
export const RTL_LOCALES: readonly Locale[] = ["he", "ar"];

export type PollKind = "knesset-election" | "referendum";
export interface PollOption { id: string; label: Partial<Record<Locale, string>> & { he: string } }
export interface PollDef {
  id: string;
  kind: PollKind;
  question: Partial<Record<Locale, string>> & { he: string };
  source: Partial<Record<Locale, string>> & { he: string };
  options: PollOption[];
  /** ADR-0020: every poll has a secret ballot + a public-positions survey. */
  publicPositions: boolean;
  dummy: boolean;
}

export interface ElectionEvent { type: "knesset" | "municipal"; /** ISO date (local election day) */ date: string }

export interface Jurisdiction {
  code: string; // ISO 3166-1 alpha-2
  timeZone: string;
  defaultLocale: Locale;
  locales: Locale[];
  eligibility: { votingAge: number; teenTrackMinAge: number };
  thresholds: { kNational: number; kSmallLocality: number; smallLocalityPopulation: number };
  publication: { batchIntervalSeconds: number; snapshotIntervalSeconds: number; roundingPercent: number; buckets: number[] };
  epoch: "calendar-month-utc";
  blackout: {
    /** Poll kinds subject to the blackout window. */
    appliesTo: PollKind[];
    /** Window starts at 00:00 local on the day after the Friday before election day (end of Friday, §16ה(ח)). */
    startRule: "end-of-friday-before";
    /** Window ends when polls close on election day (local HH:MM). */
    endsAtLocal: string;
    freezeVoting: boolean;
  };
  elections: ElectionEvent[];
}

export interface Features {
  inclusionCheck: boolean; publicPositions: boolean; govIdTier: boolean; demoLogin: boolean;
  /** ADR-0023: public layer default identity. "profile" = posts appear under the user's profile unless they choose anonymous. */
  publicIdentityDefault: "profile" | "anonymous";
  /** ADR-0023 / ADR-0006: users known to be under 18 default to anonymous in the public layer. */
  teenDefaultAnonymous: boolean;
}
export interface Services { relayUrl: string }

export interface GlobalConfig {
  jurisdiction: Jurisdiction;
  features: Features;
  services: Services;
  polls: PollDef[];
}

export class ConfigError extends Error {}

const req = (c: boolean, msg: string) => { if (!c) throw new ConfigError(msg); };
const isInt = (n: unknown, min = 0) => typeof n === "number" && Number.isInteger(n) && n >= min;

export function validate(c: GlobalConfig): GlobalConfig {
  const j = c.jurisdiction;
  req(/^[A-Z]{2}$/.test(j.code), "jurisdiction.code must be ISO alpha-2");
  req(LOCALES.includes(j.defaultLocale) && j.locales.includes(j.defaultLocale), "defaultLocale must be in locales");
  req(j.locales.every((l) => LOCALES.includes(l)), "unknown locale");
  req(isInt(j.eligibility.votingAge, 1) && isInt(j.eligibility.teenTrackMinAge, 1) && j.eligibility.teenTrackMinAge < j.eligibility.votingAge, "bad eligibility ages");
  req(isInt(j.thresholds.kNational, 1) && isInt(j.thresholds.kSmallLocality, 1) && j.thresholds.kSmallLocality >= j.thresholds.kNational, "bad k thresholds");
  req(isInt(j.publication.batchIntervalSeconds, 0) && isInt(j.publication.snapshotIntervalSeconds, 0), "bad publication cadence");
  req(isInt(j.publication.roundingPercent, 1), "bad rounding");
  req(["profile", "anonymous"].includes(c.features.publicIdentityDefault), "bad publicIdentityDefault");
  req(j.publication.buckets.length > 0 && j.publication.buckets.every((b, i, a) => isInt(b, 1) && (i === 0 || a[i - 1] > b)), "buckets must be descending positive ints");
  req(/^\d{2}:\d{2}$/.test(j.blackout.endsAtLocal), "blackout.endsAtLocal must be HH:MM");
  for (const e of j.elections) req(/^\d{4}-\d{2}-\d{2}$/.test(e.date), `bad election date ${e.date}`);
  const ids = new Set<string>();
  for (const p of c.polls) {
    req(!!p.id && !ids.has(p.id), `duplicate/empty poll id ${p.id}`); ids.add(p.id);
    req(p.options.length >= 2, `poll ${p.id} needs >=2 options`);
    req(new Set(p.options.map((o) => o.id)).size === p.options.length, `poll ${p.id} duplicate option ids`);
    req(!!p.question.he && p.options.every((o) => !!o.label.he), `poll ${p.id} missing Hebrew text`);
  }
  req(typeof c.services.relayUrl === "string" && c.services.relayUrl.length > 0, "services.relayUrl required");
  return c;
}

type Deep<T> = { [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? Deep<T[K]> : T[K] };
/** Deep merge for per-country overrides; arrays replace. */
export function merge<T>(base: T, over: Deep<T>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined) continue;
    const b = out[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b) ? merge(b, v as never) : v;
  }
  return out as T;
}
export type { Deep };
