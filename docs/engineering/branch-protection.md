# המלצות להגנת ענפים (לא הוחלו)

[← חזרה לאינדקס](../../README.md)

**ההגדרות לא שונו.** זו המלצה לנוה. **הערה:** בריפו פרטי בחשבון אישי חלק מהתכונות (rulesets, secret scanning) תלויות בתוכנית GitHub (**דורש אימות**).

- `main`: PR חובה, אישור אחד לפחות (CODEOWNER), status checks חובה (`docs`), היסטוריה ליניארית, איסור force-push ומחיקה.
- dismiss stale approvals; שיחות חייבות להיפתר.
- Secret scanning + push protection; Dependabot alerts.
- כשיהיה קוד: 2 אישורים לשינויים בתחומי A/B/crypto.
- ענפי סוכנים: `agent/<task-id>-<slug>`. רק סוכן ה-CTO ממזג, ורק כש-CI ירוק (AGENTS.md §3א, החלטת נוה 2026-10-27); סוכנים אחרים לא ממזגים.
