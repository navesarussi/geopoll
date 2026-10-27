# תוכנית חנויות (App Store + Google Play)

[← חזרה לאינדקס](../../README.md)

סטטוס: **תוכנית בלבד.** לא נפתחו חשבונות ולא הוצא כסף. ההחלטה הטכנית מוצעת ב-[ADR-0025](../decisions/0025-native-wrapper.md). הלקחים נלקחו מ-KupaPay, **בלי להעתיק סודות**: ל-GeoPoll ייווצרו מפתחות משלו.

## מה נוה צריך לעשות (בעלים בלבד)
| פעולה | עלות | הערה |
|---|---|---|
| Apple Developer Program | ‎$99 לשנה | עדיף חשבון ארגון (דורש D-U-N-S) כי אפליקציה פוליטית; **דורש עו"ד** לגבי הישות |
| Google Play Console | ‎$25 חד-פעמי | חשבון אישי חדש מחייב בדיקה סגורה של 12 בודקים ל-14 יום לפני production (**דורש אימות** למדיניות העדכנית) |
| Expo account / robot token | חינם | `EXPO_TOKEN` כ-GitHub secret |
| Branch protection על `main` | חינם | ריפו פרטי בחשבון אישי: נוה מפעיל ב-Settings, או יוצר `ADMIN_PAT` כדי שהסוכן יפעיל. check חובה יחיד: **`CI gate`** |

## סודות (שמות בלבד, ייווצרו כ-GitHub Actions secrets)
- `EXPO_TOKEN`: robot user ב-Expo.
- `ASC_API_KEY_ID`, `ASC_API_ISSUER_ID`, `ASC_API_KEY_P8`: App Store Connect API key (תפקיד App Manager).
- `PLAY_SERVICE_ACCOUNT_JSON`: service account ב-Google Cloud עם הרשאת release ב-Play Console.
- תעודות iOS ו-keystore של Android מנוהלים ב-EAS (remote credentials), לא בקבצים.

## זרימת שחרור (מוצעת)
1. ענף `agent/*` → PR → **CI gate** ירוק → מיזוג ל-`main`.
2. `workflow_dispatch` של `mobile-release.yml` (ייכתב כשתהיה אפליקציה): `eas build --profile production` → `eas submit` ל-TestFlight ול-Play internal track (draft).
3. בדיקה ידנית ב-TestFlight / internal → קידום ל-production ידנית בקונסולות.
4. לפני כל שחרור שובר: לעדכן `GEOPOLL_MIN_SUPPORTED_VERSION` (מסך force-update).
- הערה מ-KupaPay: `workflow_dispatch` עובד רק לקבצי workflow שקיימים ב-`main`.
- גרסה: `appVersionSource: remote` + `autoIncrement` ב-`eas.json`.

## תוויות פרטיות (App Privacy / Data Safety)
- חייבות להתאים **לכל** SDK. אין פרסומות, ולכן אין AdMob ואין ATT.
- Sentry / PostHog, אם יתווספו: ייחשבו "Diagnostics/Analytics", לא מקושרים לזהות, ובלי tracking.
- נתוני KYC (צילום תעודה ופנים) עוברים לספק; צריך להצהיר "Sensitive info / Identifiers". **דורש עו"ד.**
- ההצבעה החשאית לא מקושרת לזהות (ADR-0019), וזה צריך להיות מוצהר במדויק בלי הבטחות יתר (ADR-0023).

## ערך נייטיב (Guideline 4.2)
ארנק אסימונים ב-Secure Enclave / Keystore, KYC נייטיב (ובהמשך NFC), נעילה ביומטרית, push, ותור הצבעה אופליין. פירוט ב-ADR-0025.

## Force-update
`GET /api/version?v=X.Y.Z&platform=ios|android` מחזיר `minSupportedVersion`, `latestVersion`, `status` (`ok` / `update-available` / `force-update`). גרסה לא תקינה = force-update (fail closed). שליטה דרך env ב-Vercel.

## לקחים מ-KupaPay
- EAS free tier: כ-30 בניות בחודש בתור איטי; גיבוי `eas build --local`.
- אם יהיו רכישות: הסכם Paid Apps, בנק ומס לוקחים זמן. **כרגע אין תשלום ב-GeoPoll.**
- פיצ'רים רגישים מאחורי דגל מרוחק שכבוי ב-prod עד שעוברת בדיקה.
- מכסת פריסות של Vercel Hobby: `apps/web/scripts/vercel-should-build.sh`.
