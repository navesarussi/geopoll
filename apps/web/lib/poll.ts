export const DEMO_POLL = {
  id: "demo-2026-transport-1",
  label: "משאל הדגמה – נתוני דמה",
  question: "האם לדעתך כדאי להפעיל תחבורה ציבורית בסופי שבוע בעירך?",
  source: "שאלת הדגמה בלבד – לא סקר אמיתי",
  options: [
    { id: "yes", text: "כן" },
    { id: "no", text: "לא" },
    { id: "partial", text: "רק בחלק מהקווים" },
    { id: "unsure", text: "לא בטוח/ה" },
  ],
} as const;

export type OptionId = (typeof DEMO_POLL.options)[number]["id"];
export const OPTION_IDS = DEMO_POLL.options.map((o) => o.id) as string[];

/** Shared epoch for all users (ADR-0019): calendar month, UTC. */
export function currentEpoch(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
