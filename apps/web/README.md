# apps/web – גרסת הדגמה: משאל אחד

> **משאל הדגמה – נתוני דמה.** לא לשימוש מול משתמשים אמיתיים. מימוש מפושט של [ADR-0017](../../docs/decisions/0017-anonymous-credential-scheme.md), [ADR-0019](../../docs/decisions/0019-modular-identity-tiers-anonymous-vote-core.md), [ADR-0020](../../docs/decisions/0020-dual-referendum-secret-ballot-public-positions.md) ו-[ADR-0012](../../docs/decisions/0012-public-results-display-buckets-batching.md).

## הזרימה
1. התחברות: Google (Auth.js/NextAuth) או "כניסת הדגמה" מאחורי `DEMO_LOGIN=1`.
2. `POST /api/identity/issue` (תחום A): בודק שהחשבון לא קיבל כרטיס בתקופה (חודש), וחותם **עיוור** (RFC 9474, `@cloudflare/blindrsa-ts`, RSABSSA-SHA384-PSS-Randomized). נשמר רק HMAC של מזהה החשבון + תקופה.
3. הלקוח מסיר את העיוורון ושומר את הכרטיס ב-localStorage.
4. `POST /api/vote` (תחום B): נשלח עם `credentials: "omit"`, והקוד לא קורא session/cookies. מאמת חתימה ותקופה, `nullifier = SHA-256(pollId, preparedMsg)`. אותו כרטיס ⇒ אותו nullifier ⇒ ההצבעה **מחליפה** את הקודמת (האחרונה נספרת).
5. `GET /api/results`: צילום מצב באצוות (`SNAPSHOT_INTERVAL_SECONDS`), סף k=50, טווחים ("מעל 100") ואחוזים שלמים.

## מה מפושט לעומת ייצור (לא להציג כמוגן יותר ממה שהוא)
- **אין Semaphore/ZK:** ה-nullifier נגזר מהכרטיס עצמו, ולכן שרת ההצבעות יכול לקשר בין הצבעות של אותו כרטיס **בסקרים שונים** באותה תקופה (לא לזהות). ZK יפתור.
- **אין ממסר/OHTTP:** שרת ההצבעות רואה IP; אותה פריסה ואותו דומיין לתחומים A ו-B; מפעיל הפלטפורמה יכול תאורטית לקשר לפי זמן/IP. אין הפרדת תשתית.
- **תזמון:** הכרטיס מונפק מיד לפני ההצבעה הראשונה (בייצור: מראש ובמנות).
- **אחסון:** בלי `DATABASE_URL` – זיכרון בלבד, מתאפס ב-cold start, ועלול להתפצל בין מופעים. עם Postgres – טבלאות `zone_a_*` ו-`zone_b_*` נפרדות בלי מפתח משותף, אבל באותו DB.
- **אובדן כרטיס:** מחיקת localStorage = אין הצבעה עד התקופה הבאה (אין שחזור).
- **T0 (Google):** אדם עם כמה חשבונות = כמה קולות. "כניסת הדגמה" = כל לחיצה חשבון חדש.
- קליטה באצוות (ADR-0020) מפושטת: הקול נשמר מיד, רק הפרסום באצוות. אין זמן מדויק בטבלת הקולות.

## הרצה
```bash
npm ci && cp .env.example .env.local   # למלא
npm test && npm run build && npm start
```
