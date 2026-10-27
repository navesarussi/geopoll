export const K_THRESHOLD = 50; // ADR-0012 / national k

export type Tally = Record<string, number>;
export interface PublicResults {
  published: boolean;
  participants: string; // bucket label, never exact
  percents: Record<string, number> | null;
  snapshotAt: string;
  /** ADR-0019: "basic" if any counted ballot came from T0/T1 (or seed data). */
  assurance?: "basic" | "verified";
}

export function bucket(n: number): string {
  if (n < K_THRESHOLD) return `פחות מ-${K_THRESHOLD}`;
  const steps = [100000, 10000, 1000, 500, 100, 50];
  for (const s of steps) if (n >= s) return `מעל ${s.toLocaleString("en-US")}`;
  return `מעל ${K_THRESHOLD}`;
}

/** Whole-percent rounding (ADR-0012 working assumption). */
export function toPublic(tally: Tally, options: string[], snapshotAt: Date, tiers: string[] = ["T0"]): PublicResults {
  const assurance = tiers.some((t) => t === "T0" || t === "T1") ? "basic" : "verified";
  const total = options.reduce((s, o) => s + (tally[o] ?? 0), 0);
  if (total < K_THRESHOLD) {
    return { published: false, participants: bucket(total), percents: null, snapshotAt: snapshotAt.toISOString(), assurance };
  }
  const percents: Record<string, number> = {};
  for (const o of options) percents[o] = Math.round(((tally[o] ?? 0) / total) * 100);
  return { published: true, participants: bucket(total), percents, snapshotAt: snapshotAt.toISOString(), assurance };
}
