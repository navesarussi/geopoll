# AGENTS.md – כללים לסוכני AI (ולבני אדם)

> חל על כל סוכן AI שעובד בריפו. בסתירה – [README](README.md), [CONTRIBUTING](CONTRIBUTING.md) וה-ADRs גוברים.

## 1. לפני שמתחילים
- קרא: README, CONTRIBUTING, [ארכיטקטורה](docs/architecture/README.md), [backlog](docs/roadmap/backlog.md), וה-ADRs שהמשימה מפנה אליהם.
- עבוד רק על משימה מוגדרת (T-xxx) עם `agent: yes`. משימה עם `needs-lawyer` או `human-only` – **לא לבצע**.

## 2. קווים אדומים (אסור בלי ADR מאושר ע"י נוה)
1. **הפרדת זהות↔הצבעה:** אסור ליצור טבלה, מזהה, לוג, קריאת API או טיפוס שמקשר אדם לקול, או קריאה בין תחום A ל-B ([ADR-0007](docs/decisions/0007-high-assurance-identity-verification.md)).
2. אסור לשמור ביומטריה בשום צורה.
3. אסור לשנות ספים, טווחים, עיגול או אצוות ([ADR-0012](docs/decisions/0012-public-results-display-buckets-batching.md)), חלון איסור ([ADR-0004](docs/decisions/0004-election-poll-legal-labelling-blackout-il.md)) או כללי נוער ([ADR-0006](docs/decisions/0006-teen-track-13-17.md)).
4. אסור לממש פרימיטיב קריפטוגרפי בעצמך; רק ספריות לפי [ADR-0017](docs/decisions/0017-anonymous-credential-scheme.md).
5. אסור להוסיף פרסום, SDK פרסומי או tracker ([ADR-0008](docs/decisions/0008-no-advertising.md)).
6. אסור לשנות ADR שהתקבל. אסור למזג. אסור לשנות הגדרות ריפו, secrets או workflows פעילים בלי אישור.
7. אסור לכתוב סודות, מידע אישי או נתוני משתמשים אמיתיים בקוד, בבדיקות או בלוגים.

## 3. איך עובדים
- **PR קטן:** משימה אחת; **הנחה:** עד ~400 שורות שינוי.
- ענף: `agent/<T-xxx>-<slug>`. label `agent`.
- **בדיקות חובה** לכל קוד; CI ירוק.
- שינוי בתחומי A/B או ב-`packages/crypto` → label `security-review` ואישור אנושי.
- כל טענה לא מאומתת: `**דורש אימות:**`; כל ניחוש: `**הנחה:**`. **לא מציגים ניחוש כעובדה.**
- סנכרון דו-כיווני עם [טבלת העקיבות](docs/mvp-israel.md#9-טבלת-עקיבות-traceability).
- חוסר בהירות → עצור ושאל באישו; לא מנחשים דרישות.

## 4. שפה
- **תיעוד ומסמכי מוצר:** עברית. מונחים טכניים מקובלים באנגלית.
- **קוד, שמות, הערות קוד, commits טכניים:** אנגלית. commit של מסמכים: `[ציר] תיאור` (CONTRIBUTING).
- UI: עברית (RTL) כברירת מחדל; שפות נוספות – החלטה פתוחה.

## 5. הגדרת "בוצע"
קריטריוני הקבלה מתקיימים · בדיקות · CI ירוק · מסמכים מסונכרנים · אין הפרת קו אדום · תיאור PR לפי התבנית.
