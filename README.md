# GeoPoll – מקור האמת

> רשת חברתית פוליטית עולמית ומדינתית, סביב בחירות: סקרים מתמשכים, משאלי עם ופורומים. כל משתמש מאומת במלואו, ואין קישור קריפטוגרפי בין ההצבעה לזהות.

**סטטוס:** שלב גילוי / טיוטה. עודכן לאחרונה: 2026-10-22 (אושרו הצעות פיצ'רים P1–P4; נוספו ארכיטקטורה, GTM/PMF, backlog ותשתית לפיתוח; התקבלו ADR-0016/0017).

## חזון
המקום שבו אזרחים מאומתים בכל מדינה מביעים עמדה, מתווכחים בכבוד ורואים תמונת דעת קהל אמינה. אף אחד, גם לא המפעיל, לא יכול לדעת מה כל אחד הצביע.

## עקרונות יסוד (לא משתנים)
**סדר עדיפויות:** אבטחה וציות לחוק ולרגולציה קודמים לכל שיקול אחר ([ADR-0014](docs/decisions/0014-priorities-security-legal-transparency.md)).

1. **אדם אמיתי אחד = חשבון אחד = קול אחד לכל סקר.**
2. **אי-קישוריות:** שום רכיב במערכת, כולל המפעיל, לא יכול לקשר בין קול לזהות. זו דרישת סף ולא פיצ'ר.
3. **כבוד, אמת ושפה נאותה:** חוקי הבסיס נאכפים בשקיפות, ותמיד עם זכות ערעור.
4. **הפרדה בין עובדה לדעה:** דעה אינה פייק ניוז. הסרה רק בהפרות ברורות, ובמחלוקת עובדתית מוסיפים תיוג והקשר.
5. **ניטרליות פוליטית ושקיפות:** כללים, מתודולוגיה ודוחות פומביים.
6. **מזעור מידע:** לא שומרים מה שלא חייבים לשמור.
7. **כנות אפיסטמית:** כל ניחוש מסומן **הנחה**, וכל טענה משפטית שלא נבדקה מסומנת **דורש אימות**.
8. **בלי פרסומות, אף פעם:** אין פרסומות, תוכן ממומן או שימוש בנתונים לפרסום ([ADR-0008](docs/decisions/0008-no-advertising.md)).
9. **אבטחה וחוק קודם:** בכל התנגשות, אבטחה וציות לחוק ולרגולציה גוברים ([ADR-0014](docs/decisions/0014-priorities-security-legal-transparency.md)).
10. **שקיפות לכולם:** כל החלטת אבטחה ופרטיות מתפרסמת בשפה פשוטה עם הפשרות והמגבלות שלה; דוח שקיפות תקופתי; ביקורות חיצוניות; קוד קריפטוגרפי פתוח וניתן לביקורת ([ADR-0014](docs/decisions/0014-priorities-security-legal-transparency.md)).
11. **אפליקציה מהירה ונוחה:** יעדי ביצועים מדידים, הצבעה ב-1–2 לחיצות והרשמה בלי חיכוך מיותר – בלי פשרה באבטחה ([ADR-0015](docs/decisions/0015-fast-convenient-app.md)).

**קהלים:** אזרחים מאומתים (18+) ונוער מאומת (13–17, מסומן, קולות בתוצאה נפרדת – [ADR-0006](docs/decisions/0006-teen-track-13-17.md), התקבל; הפעלה מותנית בעו"ד). אימות ברמת ביטחון גבוהה ([ADR-0007](docs/decisions/0007-high-assurance-identity-verification.md), התקבל; בלי שמירת ביומטריה).

## מבנה המרחבים
- **עולמי:** סוגיות בינלאומיות.
- **מדינה:** פורומים, סקרים ומשאלים. הקריאה פתוחה לכולם, וההשתתפות לאזרחים/תושבים מאומתים; נוער 13–17 בהרשאות מוגבלות (ADR-0006).
- **בחירות:** מועמדים, מצעים, ציר זמן וסקרים, כפוף לחלונות איסור פרסום.
- **נושא:** כלכלה, ביטחון, סביבה ועוד.

## איך משתמשים בריפו
- כל **ציר עבודה** הוא קובץ ב-[`docs/axes/`](docs/axes). בכל קובץ יש את הסעיפים: מצב נוכחי, החלטות שהתקבלו, שאלות פתוחות, הנחות, קישורים.
- כל **החלטה** שהתקבלה נרשמת כ-ADR ב-[`docs/decisions/`](docs/decisions), עם תאריך ונימוק, ומקושרת מהציר הרלוונטי.
- תהליך העדכון מפורט ב-[CONTRIBUTING.md](CONTRIBUTING.md).
- מסמך האפיון המקורי (PRD v0.1): [GeoPoll – מסמך אפיון מוצר](https://cursor.com/canvas/store-b61e953b-d496-43f4-8ec0-a6e94d98cd98/366e1a75-5962-4996-9385-1472b7ac13ca). מעכשיו הריפו הזה הוא מקור האמת.

## אינדקס
| # | ציר | קובץ |
|---|---|---|
| 01 | אבטחה, זיהוי ופרטיות | [01-security-identity-privacy.md](docs/axes/01-security-identity-privacy.md) |
| 02 | תוכן | [02-content.md](docs/axes/02-content.md) |
| 03 | אמון ובטיחות: אכיפת כבוד, אמת ושפה, בדיקת עובדות וערעורים | [03-trust-safety.md](docs/axes/03-trust-safety.md) |
| 04 | מנגנוני הצבעה: סקרים ומשאלי עם | [04-voting-mechanics.md](docs/axes/04-voting-mechanics.md) |
| 05 | משפט ורגולציה | [05-legal-regulatory.md](docs/axes/05-legal-regulatory.md) |
| 06 | תשתית והנדסה | [06-infrastructure-engineering.md](docs/axes/06-infrastructure-engineering.md) |
| 07 | ממשל ואמון | [07-governance-trust.md](docs/axes/07-governance-trust.md) |
| 08 | עסקי ומימון | [08-business-funding.md](docs/axes/08-business-funding.md) |
| 09 | שיווק | [09-marketing.md](docs/axes/09-marketing.md) |
| 10 | עיצוב | [10-design.md](docs/axes/10-design.md) |
| 11 | צמיחה בקרב צעירים ונוער | [11-youth-growth.md](docs/axes/11-youth-growth.md) |
| — | **תוכנית MVP ישראל** (מסמך נגזר) | [docs/mvp-israel.md](docs/mvp-israel.md) |
| — | הצעות לפיצ'רים (מוצע) | [docs/features/proposals.md](docs/features/proposals.md) |
| — | יומן החלטות | [docs/decisions/](docs/decisions/README.md) |
| — | ארכיטקטורה (מוצע) | [docs/architecture/](docs/architecture/README.md) |
| — | יציאה לשוק והתאמת מוצר לשוק (מוצע) | [docs/gtm/](docs/gtm/README.md) |
| — | Backlog משימות (מוצע) | [docs/roadmap/backlog.md](docs/roadmap/backlog.md) |
| — | הנדסה: [monorepo](docs/engineering/monorepo.md), [CI/CD](docs/engineering/ci-cd.md), [הגנת ענפים](docs/engineering/branch-protection.md) | [docs/engineering/](docs/engineering/monorepo.md) |
| — | כללים לסוכני AI | [AGENTS.md](AGENTS.md) |

## היררכיית מסמכים
1. **האפיון הראשי (ההורה):** README, `docs/axes/*` ו-`docs/decisions/*` (ה-PRD הוא הרקע ההיסטורי). כאן מוגדרים החזון, העקרונות וההחלטות.
2. **מסמכי MVP (נגזרים):** למשל [docs/mvp-israel.md](docs/mvp-israel.md). הם מפנים לאפיון הראשי ולא מגדירים אותו מחדש. כל סטייה מסומנת במפורש ומלווה ב-ADR.
3. **סנכרון דו-כיווני:** כל שינוי באחד הצדדים מחייב לבדוק ולעדכן את הצד השני באותו commit. טבלת העקיבות ב-MVP היא רשימת הבדיקה. פירוט ב-[CONTRIBUTING](CONTRIBUTING.md#סנכרון-אפיון-ראשי--mvp).

- [ניתוח מתחרים](docs/competitors.md)
- [מחקר בינלאומי: ארה"ב, EU+גרמניה, האו"ם](docs/international/README.md)
- [מחקר: אתר "כל זכות" (רישיון, קטלוג זכויות)](docs/research/kol-zchut.md)
