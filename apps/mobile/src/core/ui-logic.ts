import type { LivePoll } from "./polls";
/** Pure view logic for the poll/results screens (tested in tests/ui-logic.test.ts). */
export type ChipTone = "ok" | "warn" | "muted" | "err";
export function pollChip(p: Pick<LivePoll, "status" | "blackout" | "kind">): { key: "m_stOpen" | "m_stClosed" | "m_stScheduled" | "m_stFrozen"; tone: ChipTone } {
  if (p.blackout && p.kind !== "referendum") return { key: "m_stFrozen", tone: "warn" };
  if (p.status === "open") return { key: "m_stOpen", tone: "ok" };
  if (p.status === "scheduled") return { key: "m_stScheduled", tone: "muted" };
  return { key: "m_stClosed", tone: "err" };
}
export const canVote = (p: Pick<LivePoll, "status" | "blackout" | "kind">, signed: boolean) =>
  signed && p.status === "open" && !(p.blackout && p.kind !== "referendum");
/** Chart rows: only options the API published, sorted desc, clamped 0..100, with the leader flagged. Never invents data. */
export function chartRows(options: { id: string; text: string }[], percents: Record<string, number> | undefined) {
  const rows = options.filter((o) => typeof percents?.[o.id] === "number" && Number.isFinite(percents[o.id]))
    .map((o) => ({ ...o, pct: Math.max(0, Math.min(100, percents![o.id])) }))
    .sort((a, b) => b.pct - a.pct);
  return rows.map((r, i) => ({ ...r, leader: i === 0 && r.pct > 0 && (rows[1]?.pct ?? -1) < r.pct }));
}
