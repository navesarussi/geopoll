# ADR-0026: דיווח שגיאות וקריסות עם Sentry (פרטיות קודם)

- **תאריך:** 2026-10-27
- **סטטוס:** מוצע (טכני; דורש אישור נוה – פרטיות/ספק)
- **צירים:** אמינות, פרטיות, מובייל, ווב

## הקשר
TestFlight build 5 קרס בהפעלה ולא היה לנו דוח קריסה (ראו docs/engineering/bug-learnings.md #1). צריך דיווח קריסות אוטומטי, אבל בלי לפגוע בחשאיות ההצבעה.

## החלטה
`@sentry/react-native` ב-apps/mobile ו-`@sentry/nextjs` ב-apps/web, בתוכנית החינמית (Developer) בלבד. כבוי כברירת מחדל: פעיל רק אם הוגדר DSN
(`EXPO_PUBLIC_SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`). העלאת source maps רק אם `SENTRY_AUTH_TOKEN` מוגדר כסוד ב-EAS/Vercel.

כללי פרטיות (נאכפים בקוד ובבדיקות `tests/scrub.test.ts`):
- `sendDefaultPii: false`; מחיקת `event.user`, `event.request`, `server_name` → אין IP, עוגיות, כותרות או גוף בקשה.
- מפתחות רגישים (vote, ballot, choice, option, token, nullifier, sig, blind, session, auth, email, phone, name, ip…) מוחלפים ב-`[scrubbed]`.
- מחרוזות אטומות ארוכות (JWT/base64 ≥24 תווים) מוסרות מהודעות שגיאה.
- אין breadcrumbs של console/fetch/xhr/http; אין משתני frame.
- אין Session Replay, אין צילומי מסך/היררכיית תצוגה, אין tracing (`tracesSampleRate: 0`).
- ב-Sentry: יש לסמן "Prevent Storing of IP Addresses" ו-Data Scrubber בהגדרות הארגון/פרויקט (שכבת הגנה שנייה).

## חלופות
Crashlytics (גוגל, מזהי מכשיר ופרסום – נדחה), דוחות TestFlight בלבד (רק בודקים, ידני – נשאר כ-`iOS crash logs` workflow).

## השלכות
- גילוי ב-App Privacy: "Crash Data / Diagnostics, not linked to user, not used for tracking".
- שאלה לעו"ד: העברת נתוני אבחון (ללא PII) לספק בארה"ב/אירופה – docs/legal/lawyer-questions.md.
