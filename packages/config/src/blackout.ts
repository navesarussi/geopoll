import type { Jurisdiction, PollKind } from "./schema";

/** Wall-clock parts of `d` in `timeZone`. */
function localParts(d: Date, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: `${p.hour}:${p.minute}` };
}
const addDays = (iso: string, n: number) => { const t = new Date(`${iso}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/** Local [startDate 00:00, electionDate endsAtLocal) per §16ה(ח) / ADR-0004. Start = Saturday after the Friday before election day. */
export function blackoutWindow(electionDate: string): { startDate: string } {
  const dow = new Date(`${electionDate}T00:00:00Z`).getUTCDay(); // 5 = Friday
  const back = ((dow - 5 + 7) % 7) || 7; // days back to the previous Friday (strictly before)
  return { startDate: addDays(electionDate, -back + 1) };
}

export function isBlackout(j: Jurisdiction, kind: PollKind, now: Date): { active: boolean; election?: string } {
  if (!j.blackout.appliesTo.includes(kind)) return { active: false };
  const { date, hm } = localParts(now, j.timeZone);
  for (const e of j.elections) {
    const { startDate } = blackoutWindow(e.date);
    const afterStart = date >= startDate;
    const beforeEnd = date < e.date || (date === e.date && hm < j.blackout.endsAtLocal);
    if (afterStart && beforeEnd) return { active: true, election: e.date };
  }
  return { active: false };
}
