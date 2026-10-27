import { LOCALES, RTL_LOCALES, type Locale, type PollDef } from "@geopoll/config";

/** UI strings. he = source of truth; en scaffolded; ar/ru stubbed (fall back to he until translated). */
const he = {
  beta: "בטא לבדיקה · הנתונים עלולים להתאפס · זו לא הצבעה רשמית",
  dummyBadge: "נתוני דמה",
  kindKnesset: "סקר בחירות לכנסת",
  kindReferendum: "משאל עם",
  secretBallot: "הצבעה חשאית",
  signInGoogle: "כניסה עם Google",
  signInDemo: "כניסת הדגמה (ללא אימות)",
  noProvider: "אין ספק התחברות מוגדר.",
  sending: "שולח…",
  youChose: "בחרת",
  retry: "נסו שוב",
  secretExplainer: "ההצבעה חשאית: השרת שמזהה אותך חותם על כרטיס בלי לראות אותו, ושרת ההצבעות מקבל רק את הכרטיס. אפשר לשנות הצבעה עד הסגירה.",
  checkInclusion: "האם ההצבעה שלי נספרה?",
  signOut: "יציאה",
  voteCreated: "ההצבעה שלך נקלטה ✓ (תיספר בעדכון האצווה הבא)",
  voteReplaced: "ההצבעה שלך עודכנה ✓ (רק האחרונה נספרת)",
  voteFailed: "ההצבעה לא נקלטה. בדקו חיבור ונסו שוב.",
  err_already_issued: "כבר הונפק לחשבון הזה כרטיס הצבעה בתקופה הנוכחית, אבל הוא לא נמצא במכשיר הזה. בגרסת ההדגמה אי אפשר לשחזר אותו.",
  err_bad_token: "כרטיס ההצבעה לא תקין.",
  err_no_tier: "לחשבון הזה אין עדיין רמת אימות שמאפשרת הצבעה.",
  err_tier_mismatch: "רמת האימות שלך השתנתה. נסו שוב.",
  err_wrong_epoch: "כרטיס ההצבעה פג תוקף (תקופה חדשה). נסו שוב.",
  err_blackout: "ההצבעה בסקרי בחירות מוקפאת בתקופת האיסור שלפני הבחירות (סעיף 16ה לחוק הבחירות).",
  incChecking: "בודק…",
  incNoToken: "אין במכשיר כרטיס הצבעה לתקופה הזו.",
  incCounted: "ההצבעה שלך נכללת בספירה ✓",
  incQueued: "ההצבעה שלך בתור ותיספר באצווה הבאה.",
  incNone: "לא נמצאה הצבעה מהמכשיר הזה.",
  incFailed: "הבדיקה נכשלה. נסו שוב.",
  incNote: "הבדיקה לא מציגה את הבחירה ואינה הוכחה שאפשר להראות לאחרים.",
  results: "תוצאות (צילום מצב)",
  loading: "טוען…",
  participants: "משתתפים",
  belowK: "התוצאות יוצגו כשיהיו לפחות {k} משתתפים.",
  blackout: "פרסום תוצאות של סקרי בחירות אסור בתקופה שמתום יום שישי שלפני הבחירות ועד סגירת הקלפיות (סעיף 16ה(ח)). התוצאות יוצגו אחרי סגירת הקלפיות.",
  updated: "עודכן",
  resultsNote: "התוצאות מתעדכנות באצוות, באחוזים מעוגלים ובטווחים. כוללות קולות דמה.",
  basicAssurance: " רמת אימות בסיסית (Google) – לא אדם אחד = קול אחד.",
  electionLabel: "סקר אינטרנטי שאינו מדגם מייצג (סעיף 16ה(ד)). עורך הסקר: GeoPoll (בטא).",
  refresh: "רענון",
  privacy: "מה נשמר עליי? (הודעת פרטיות – טיוטה)",
  language: "שפה",
};
export type Dict = typeof he;
const en: Dict = {
  ...he,
  beta: "Test beta · data may reset · not an official vote",
  dummyBadge: "Dummy data", kindKnesset: "Knesset election poll", kindReferendum: "Referendum",
  secretBallot: "Secret ballot", signInGoogle: "Sign in with Google", signInDemo: "Demo sign-in (unverified)",
  sending: "Sending…", youChose: "You chose", retry: "Try again", checkInclusion: "Was my vote counted?", signOut: "Sign out",
  voteCreated: "Your vote was received ✓ (counted at the next batch)", voteReplaced: "Your vote was updated ✓ (only the latest counts)",
  voteFailed: "Your vote was not received. Check your connection and try again.",
  results: "Results (snapshot)", loading: "Loading…", participants: "Participants", belowK: "Results are shown once there are at least {k} participants.",
  updated: "Updated", refresh: "Refresh", language: "Language",
};
const stub: Dict = { ...he }; // ar, ru: keys present, values fall back to Hebrew until translated (T-3xx).
export const DICTS: Record<Locale, Dict> = { he, en, ar: stub, ru: stub };

export const resolveLocale = (q: string | undefined, allowed: Locale[], dflt: Locale): Locale =>
  (q && (LOCALES as string[]).includes(q) && allowed.includes(q as Locale) ? (q as Locale) : dflt);
export const dirOf = (l: Locale) => (RTL_LOCALES.includes(l) ? "rtl" : "ltr");
export const tr = (d: Dict, key: keyof Dict, vars: Record<string, string | number> = {}) =>
  d[key].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
export const pollText = (p: PollDef, l: Locale) => ({
  question: p.question[l] ?? p.question.he,
  options: p.options.map((o) => ({ id: o.id, text: o.label[l] ?? o.label.he })),
});
