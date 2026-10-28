# Backlog – אפיקים ומשימות

[← חזרה לאינדקס](../../README.md)

- **סטטוס:** מוצע. **לא נוצרו** issues, milestones או labels ב-GitHub. הסקריפט [`scripts/create-issues`](../../scripts/create-issues) יוצר אותם מהקובץ הזה (dry-run כברירת מחדל).
- **פורמט (נקרא ע"י הסקריפט):** כל משימה היא כותרת `### T-xxx: כותרת` ואחריה שורות שדה `- **שדה:** ערך`. אל תשנו שמות שדות.
- שלבים לפי [mvp-israel](../mvp-israel.md#6-שלבים). כל משימה עם `needs-lawyer: yes` אפשר לבנות מאחורי flag ועם נתוני דמה, אבל אסור להפעיל מול משתמשים אמיתיים עד שיש חוות דעת ([שאלות לעו"ד](../legal/lawyer-questions.md)).

## E0 · תשתית ופיתוח

### T-001: הפעלת workflow התיעוד והגנת main
- **phase:** 0
- **labels:** type:infra, human-only
- **agent:** no
- **needs-lawyer:** no
- **depends:** —
- **acceptance:** docs.yml ירוק על main; הגנת ענפים לפי [branch-protection](../engineering/branch-protection.md) הוחלה ע"י נוה.

### T-002: שלד monorepo לפי ADR-0016
- **phase:** 0
- **labels:** type:infra, agent, needs-adr
- **agent:** yes
- **needs-lawyer:** no
- **depends:** ADR-0016 התקבל
- **acceptance:** pnpm/Turborepo + Cargo workspace מותקנים; `lint` ו-`test` רצים ריקים בהצלחה; README בכל חבילה מעודכן.

### T-003: הפעלת תבניות CI לקוד ואבטחה
- **phase:** 0
- **labels:** type:infra, security-review, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002
- **acceptance:** ci-code, security, boundary-check עוברים ל-workflows ורצים ירוק; CodeQL מופעל; SBOM נוצר כ-artifact.

### T-004: רשימת רישיונות מותרים לתלויות
- **phase:** 0
- **labels:** type:docs, needs-lawyer
- **agent:** no
- **needs-lawyer:** yes
- **depends:** —
- **acceptance:** רשימה מאושרת ע"י עו"ד (כולל AGPL) מוגדרת ב-dependency review.

## E1 · זהות ואישורים אנונימיים (תחום A)

### T-101: PoC Semaphore + blind signature במובייל
- **phase:** 0
- **labels:** type:research, zone:A-identity, zone:B-voting, security-review, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** —
- **acceptance:** הפקת הוכחה ואימותה במכשיר iOS ו-Android בינוניים; דוח זמנים מדודים (לא מוערכים); קוד ב-branch נפרד; עדכון ADR-0017 בממצאים.

### T-102: בדיקת תמיכת Rarimo בדרכון ישראלי / ת"ז חכמה
- **phase:** 0
- **labels:** type:research, zone:A-identity
- **agent:** yes
- **needs-lawyer:** no
- **depends:** —
- **acceptance:** תשובה עם מקורות (תיעוד/בדיקה בפועל) ב-competitors.md; בלי פנייה חיצונית בלי אישור נוה.

### T-103: מודל איומים STRIDE מלא
- **phase:** 0
- **labels:** type:security, security-review, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** —
- **status:** בוצע (2026-10-28) – [threat-model.md](../architecture/threat-model.md) v1.0; בדיקת CI `scripts/ci/threat-model-stride.mjs`
- **acceptance:** STRIDE לכל שירות ב-docs/architecture/threat-model.md; ניתוח מתאם זמנים והתקפות הפרש.

### T-104: השוואת ספקי KYC לפי קריטריוני ADR-0007
- **phase:** 0
- **labels:** type:research, zone:A-identity, needs-lawyer
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** —
- **acceptance:** טבלה עם מקורות (PAD, zero-retention, מסמכים ישראליים, מיקום נתונים, מחיר); ADR מוצע לבחירת ספק.

### T-105: שירות זהות – זכאות לפי epoch ו-hash מפתחי
- **phase:** 1
- **labels:** type:feature, zone:A-identity, security-review, needs-adr
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** T-002, T-101, T-104, ADR-0017
- **acceptance:** נשמר רק "מאושר+מדינה+קבוצת גיל"+HMAC; בדיקה אוטומטית שאין שדה ביומטרי/commitment/IP בסכמה; בדיקות יחידה ואינטגרציה.

### T-106: מנפיק עיוור עם HSM ואצוות
- **phase:** 1
- **labels:** type:feature, zone:A-identity, security-review, needs-adr
- **agent:** no
- **needs-lawyer:** no
- **depends:** T-105
- **acceptance:** חתימה עיוורת לפי ADR-0017; הנפקה באצוות עם השהיה אקראית; מפתח לא יוצא מ-HSM; ביקורת אנושית.

### T-107: ממשק זהות נשלף ורמות אמינות (ADR-0019)
- **phase:** 0
- **labels:** type:feature, zone:A-identity, agent, security-review
- **agent:** yes
- **needs-lawyer:** no
- **depends:** —
- **acceptance:** ממשק מתאם שמחזיר רק tier ודליים גסים; בדיקות; אין מזהה משתמש בפלט.

### T-108: מתאם Google OAuth (T0)
- **phase:** 0
- **labels:** type:feature, zone:A-identity, agent, security-review
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-107
- **acceptance:** OIDC עם PKCE; tier T0; שמירת מייל כבויה עד אישור עו"ד (feature flag).

### T-109: ת"ז: ספרת ביקורת + HMAC לדה-דופליקציה (T1)
- **phase:** 0
- **labels:** type:security, zone:A-identity, needs-lawyer, security-review
- **agent:** no
- **needs-lawyer:** yes
- **depends:** T-107, T-601
- **acceptance:** אין שמירת ת"ז גלוי; HMAC עם מפתח KMS; חסום עד חוות דעת עו"ד.

### T-110: relay בין המכשיר לתחום B
- **phase:** 0
- **labels:** type:infra, zone:B-voting, agent, security-review
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002
- **acceptance:** מסיר IP ומטא-דאטה; אין לוג מזהה; אין נתיב A↔B.

### T-111: מחולל נתוני דמה סינתטיים
- **phase:** 0
- **labels:** type:infra, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-107
- **acceptance:** מייצר משתמשים, tiers, הצבעות, דמוגרפיה ומקרי קצה (ניסיונות הצבעה כפולה, גבולות סף k); בלי נתונים אמיתיים; seed דטרמיניסטי.
- **sources:** התפלגויות מצרפיות לפי [מחקר מקורות נתונים](../research/data-sources.md) (מפקד 2022, תוצאות כנסת לפי יישוב/קלפי).

## E2 · הצבעה ותוצאות (תחום B)

### T-201: שירות הצבעה – אימות הוכחה ו-nullifier
- **phase:** 1
- **labels:** type:feature, zone:B-voting, security-review, needs-adr
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-101, ADR-0017
- **acceptance:** דוחה הוכחה לא תקפה ו-nullifier כפול; לא נשמר IP; לוג append-only; כיסוי בדיקות לכל ענף.

### T-202: הקפאה אוטומטית בחלון איסור
- **phase:** 1
- **labels:** type:feature, zone:B-voting, needs-lawyer
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** T-201, T-401
- **acceptance:** לפי ADR-0004: הצבעה וחשיפת תוצאות סקרי בחירות מוקפאות מתום יום שישי ועד סגירת הקלפיות; בדיקות עם שעון מדומה; kill switch ידני.

### T-203: שירות תוצאות – ספים, טווחים, עיגול, אצוות
- **phase:** 1
- **labels:** type:feature, zone:B-voting, security-review
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-201
- **acceptance:** מיישם ADR-0012 ו-k (50/100, עד 2 ממדים); property tests שאין פלט מתחת לסף; תווית 16ה(ד).

### T-204: שכבת DP לפילוחים
- **phase:** 3
- **labels:** type:feature, zone:B-voting, security-review, needs-adr
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** T-203, P3 אושר
- **acceptance:** ספרייה מבוקרת; תקציב ε מוגדר ב-ADR; בדיקות.

### T-205: תיוג רמת אמינות בתוצאות
- **phase:** 0
- **labels:** type:feature, zone:B-voting, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-203, T-107
- **acceptance:** T0/T1 מסומנים "רמה בסיסית / לא מאומת"; לא מוצג כאדם אחד קול אחד.

### T-206: הצבעה מחדש עד סגירה (nullifier מחליף) – ADR-0020
- **phase:** 0
- **labels:** type:feature, zone:B-voting, agent, security-review, needs-adr
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-201
- **acceptance:** הקול האחרון קובע; אין קבלה שאפשר להעביר; בדיקות.

### T-207: משוב הצבעה ואימות אישי שלא אפשר להעביר
- **phase:** 0
- **labels:** type:feature, zone:B-voting, agent, security-review, needs-adr
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-201, T-501
- **acceptance:** חיווי הצלחה/כישלון + ניסיון חוזר; המכשיר בודק שהקול נכלל; אין הוכחה לצד שלישי.

### T-208: סקר עמדות פומביות נפרד
- **phase:** 1
- **labels:** type:feature, zone:C-app, needs-adr, needs-lawyer
- **agent:** no
- **needs-lawyer:** yes
- **depends:** T-302
- **acceptance:** נספר ומתויג בנפרד; אין קישור לקלפי החשאית; אישור עו"ד.

### T-209: סקרים פתוחים תמיד – מדד וצילומים תקופתיים
- **phase:** 1
- **labels:** type:feature, zone:B-voting, needs-adr, needs-lawyer
- **agent:** no
- **needs-lawyer:** yes
- **depends:** T-203, T-206
- **acceptance:** פרסום רק בצילומים קבועים, טווחים וספי k; הקפאה לפי 16ה אחרי עו"ד.

## E3 · תוכן ומודרציה (תחום C)

### T-301: ingestion מ-OData של הכנסת
- **phase:** 1
- **labels:** type:feature, zone:C-app, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002
- **acceptance:** ח"כים, סיעות והצעות חוק נטענים ומתעדכנים; בדיקות עם fixtures; תנאי שימוש של המקור תועדו (**דורש אימות**).

### T-302: פורומים ופיד מאוזן
- **phase:** 1
- **labels:** type:feature, zone:C-app, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002
- **acceptance:** יצירה/תגובה/דיווח; תג "מאומת" בהוכחת ZK נפרדת בלי קישור לחשבון הצבעה.

### T-303: צנרת מודרציה וערעורים
- **phase:** 1
- **labels:** type:feature, zone:C-app, needs-lawyer
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** T-302
- **acceptance:** סיווג → תור → ערעור; כל החלטה נרשמת לדוח שקיפות; עקרון 4 (דעה אינה פייק ניוז).

## E4 · קונפיגורציה מדינתית וזכאות

### T-401: לוח בחירות IL וכללי זכאות
- **phase:** 1
- **labels:** type:feature, zone:C-app, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002
- **acceptance:** קונפיגורציה מגורסת לתאריכים, חלונות וזכאות לפי ADR-0005/0013; ולידציה בסכמה.

## E5 · לקוחות

### T-501: שלד אפליקציית מובייל עם ארנק
- **phase:** 1
- **labels:** type:feature, agent, security-review
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-002, T-101
- **acceptance:** RTL; סוד ב-Secure Enclave/StrongBox; הצבעה ב-1–2 לחיצות (ADR-0015); performance budget ב-CI.

### T-502: כרטיסי שיתוף תוצאות
- **phase:** 1
- **labels:** type:feature, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** T-203, T-501
- **acceptance:** רק טווחים ואחוזים מעוגלים; תווית 16ה(ד); אין שיתוף בחלון איסור.

## E6 · משפט, שקיפות ו-GTM

### T-601: DPIA ותיקון 13
- **phase:** 0
- **labels:** type:docs, needs-lawyer, human-only
- **agent:** no
- **needs-lawyer:** yes
- **depends:** —
- **acceptance:** DPIA חתום ע"י עו"ד; החלטה על מיקום נתונים.

### T-602: חוות דעת קטינים ודעות פוליטיות
- **phase:** 1b
- **labels:** type:docs, needs-lawyer, human-only
- **agent:** no
- **needs-lawyer:** yes
- **depends:** —
- **acceptance:** חוות דעת כתובה; חוסמת את שלב 1ב עד שמתקבלת.

### T-603: תבנית דוח שקיפות ודף סטטוס
- **phase:** 1
- **labels:** type:docs, agent
- **agent:** yes
- **needs-lawyer:** no
- **depends:** —
- **acceptance:** תבנית ב-docs; מדדים מצרפיים בלבד.

### T-604: waitlist ובטא סגורה ל-18–25
- **phase:** 0
- **labels:** type:feature, agent
- **agent:** yes
- **needs-lawyer:** yes
- **depends:** T-601
- **acceptance:** דף הרשמה בלי trackers פרסומיים; מדיניות פרטיות מאושרת; מדדי [GTM](../gtm/README.md#4-מדדי-pmf-כל-היעדים--הנחה).
