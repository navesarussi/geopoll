import { config } from "./config";

export type Tally = Record<string, number>;
export interface PublicResults {
  published: boolean;
  participants: string; // bucket label, never exact
  percents: Record<string, number> | null;
  snapshotAt: string;
  /** ADR-0019: "basic" if any counted ballot came from T0/T1 (or seed data). */
  assurance?: "basic" | "verified";
  /** ADR-0004: §16ה(ח) blackout – publication suppressed. */
  blackout?: boolean;
  /** #77: pre-window snapshot shown during blackout, explicitly "not current". */
  stale?: boolean;
}

/** k-threshold from config (ADR-0012). Small localities use kSmallLocality once locality polls exist. */
export const kThreshold = () => config().jurisdiction.thresholds.kNational;
export const K_THRESHOLD = kThreshold();

/** Language-neutral bucket label ("<50", "1,000+"); rendered as-is in every locale (#71). */
export function bucket(n: number): string {
  const k = kThreshold();
  if (n < k) return `<${k}`;
  for (const s of config().jurisdiction.publication.buckets) if (n >= s) return `${s.toLocaleString("en-US")}+`;
  return `${k}+`;
}

/** Rounding per config (ADR-0012 working assumption: whole percent). */
export function toPublic(tally: Tally, options: string[], snapshotAt: Date, tiers: string[] = ["T0"]): PublicResults {
  const assurance = tiers.some((t) => t === "T0" || t === "T1") ? "basic" : "verified";
  const total = options.reduce((s, o) => s + (tally[o] ?? 0), 0);
  if (total < kThreshold()) {
    return { published: false, participants: bucket(total), percents: null, snapshotAt: snapshotAt.toISOString(), assurance };
  }
  const r = config().jurisdiction.publication.roundingPercent;
  const percents: Record<string, number> = {};
  for (const o of options) percents[o] = Math.round(((tally[o] ?? 0) / total) * 100 / r) * r;
  return { published: true, participants: bucket(total), percents, snapshotAt: snapshotAt.toISOString(), assurance };
}

/** Suppressed view during blackout: no numbers at all (not even the bucket). */
export const blackoutResults = (now: Date): PublicResults =>
  ({ published: false, participants: "", percents: null, snapshotAt: now.toISOString(), blackout: true });
