import type { Deep, GlobalConfig, PollDef } from "./schema";

/**
 * Knesset 25 lists that passed the threshold (CEC results, Nov 2022) – used ONLY as DUMMY options.
 * **דורש אימות:** spelling/letters vs. the official CEC file (services/historical-data, Knesset 25).
 */
const K25: [string, string, string][] = [
  ["mhl", "מחל", "הליכוד"], ["peh", "פה", "יש עתיד"], ["t", "ט", "הציונות הדתית"], ["kn", "כן", "המחנה הממלכתי"],
  ["shas", "שס", "ש\"ס"], ["g", "ג", "יהדות התורה"], ["l", "ל", "ישראל ביתנו"], ["am", "עם", "רע\"מ"],
  ["vm", "ום", "חד\"ש-תע\"ל"], ["emet", "אמת", "העבודה"],
];

export const IL_POLLS: PollDef[] = [
  {
    id: "il-knesset-dummy-1", kind: "knesset-election", dummy: true, publicPositions: true,
    question: { he: "אילו הבחירות לכנסת היו מתקיימות היום, לאיזו רשימה היית מצביע/ה?", en: "If Knesset elections were held today, which list would you vote for?" },
    source: "סקר דמה. הרשימות: רשימות שעברו את אחוז החסימה בכנסת ה-25 (נתוני דמה בלבד)",
    options: [...K25.map(([id, letters, name]) => ({ id, label: { he: `${name} (${letters})` } })), { id: "other", label: { he: "רשימה אחרת", en: "Other list" } }, { id: "none", label: { he: "לא אצביע / לא יודע/ת", en: "Won't vote / unsure" } }],
  },
  {
    id: "il-referendum-dummy-1", kind: "referendum", dummy: true, publicPositions: true,
    question: { he: "האם לדעתך כדאי להפעיל תחבורה ציבורית בסופי שבוע בעירך?", en: "Should public transport run on weekends in your city?" },
    source: "משאל הדגמה בלבד – לא משאל אמיתי",
    options: [{ id: "yes", label: { he: "כן", en: "Yes" } }, { id: "no", label: { he: "לא", en: "No" } }],
  },
];

/** Israel overrides. Every value here traces to an ADR (0004 blackout, 0005/0006 ages, 0012 k/buckets, 0020 cadence). */
export const il: Deep<GlobalConfig> = {
  jurisdiction: {
    code: "IL", timeZone: "Asia/Jerusalem", defaultLocale: "he", locales: ["he", "en", "ar", "ru"],
    eligibility: { votingAge: 18, teenTrackMinAge: 13 },
    thresholds: { kNational: 50, kSmallLocality: 100, smallLocalityPopulation: 10000 },
    blackout: { appliesTo: ["knesset-election"], startRule: "end-of-friday-before", endsAtLocal: "22:00", freezeVoting: true },
    // **דורש אימות:** official date of the next Knesset election – set via GEOPOLL_ELECTIONS until confirmed.
    elections: [],
  },
  polls: IL_POLLS,
};
