# מודל איומים – STRIDE מלא

[← ארכיטקטורה](README.md)

- **סטטוס:** טיוטה v1.0 (T-103, 2026-10-28). מבוסס על [ציר 01](../axes/01-security-identity-privacy.md), [ארכיטקטורה](README.md) וה-ADRs הרלוונטיים. **לא ייעוץ משפטי.**
- **מטרה:** STRIDE לכל רכיב/שירות שמופיע בריפו או בדיאגרמת הארכיטקטורה; ניתוח מתאם זמנים והתקפות הפרש בין פרסומי תוצאות.
- **מקרא סטטוס מיטיגציה:** `מיושם` = קיים בקוד/CI/ADR מחייב; `מתוכנן (T-xxx)` = backlog; `**הנחה**` = לא אומת בייצור.
- **חומרה:** קритי / גבוה / בינוני / נמוך (יחסית לעקרונות 1–2: קישור קול↔זהות, Sybil, דה-אנונימיזציה).

## 1. סיכום איומים עליון (T1–T12)

| # | איום | תוקף | מיטיגציה (סיכום) | שארית | קישור לפרטים |
|---|---|---|---|---|---|
| T1 | קישור קול↔זהות ע"י המפעיל | עובד/הנהלה/דרישה ממשלתית | תחומי אמון, הנפקה עיוורת, אין טבלת קישור, relay | מתאם זמנים/מטא-דאטה | [§6](#timing-correlation), [§4](#stride-by-service) |
| T2 | Sybil / בוטים / חשבון כפול | גורם פוליטי, חוות בוטים | KYC + liveness (ADR-0007), hash מסמך, tier T2 | T0/T1 חשופים ל-Sybil (ADR-0019) | [§4.2](#svc-identity-service), [§4.3](#svc-identity-adapters) |
| T3 | דה-אנונימיזציה במתאם זמנים | מפעיל/צופה רשת | אצוות, חלונות epoch, השהיה אקראית, OHTTP | גודל אצווה מינימלי TBD | [§6](#timing-correlation) |
| T4 | דה-אנונימיזציה סטטיסטית מתוצאות | חוקר/עיתונאי | k, טווחים, עיגול, אצוות (ADR-0012), DP (T-204) | התקפות הפרש | [§7](#differencing) |
| T5 | פריצה לספק KYC | תוקף חיצוני | zero-retention חוזי (ADR-0007) | **דורש אימות** מול ספק | [§4.1](#svc-kyc-external) |
| T6 | גניבת מפתח מנפיק | תוקף/פנים | HSM, threshold 3-of-5 (**הנחה**), רוטציה לפי epoch | אישורים מזויפים עד רוטציה | [§4.4](#svc-blind-issuer) |
| T7 | כפייה וקניית קולות | מעסיק/משפחה | re-vote (T-206, ADR-0020) | אין פתרון מלא מרחוק | [§4.8](#svc-voting-service) |
| T8 | DDoS / עומס בבחירות | מדינה/האקטיביסטים | CDN, autoscale, תורים (**הנחה**) | — | [§4.10](#svc-api-gateway), [§4.8](#svc-voting-service) |
| T9 | השתלטות חשבון/מכשיר | תוקף | Passkeys (**הנחה**), epoch, אימות מחדש | חלון עד epoch הבא | [§4.5](#svc-client-wallet), [§4.2](#svc-identity-service) |
| T10 | פרסום בחלון איסור 16ה | באג/מפעיל | `packages/config` + `isBlackout` (ADR-0004) | **דורש אימות** משפטי | [§4.13](#svc-config-cfg), [§4.9](#svc-results-service) |
| T11 | דליפת נתוני קטינים | כל תוקף | קבוצה נפרדת, k≥100, DP (ADR-0009 §8) | הפעלה רק אחרי עו"ד | [§4.9](#svc-results-service), [§4.2](#svc-identity-service) |
| T12 | שרשרת אספקה | תוקף | gitleaks, dependency review (**תבנית**), lint | CodeQL/SBOM עדיין בתבנית | [§4.18](#svc-ci-supply-chain) |

## 2. תחומי אמון ורכיבים (מלאי מהריפו)

| תחום | רכיב | מיקום בריפו / מסמך | הערות |
|---|---|---|---|
| A | ספק KYC | [ADR-0007](../decisions/0007-high-assurance-identity-verification.md) | חיצוני; אין קוד ספק |
| A | שירות זהות | [services/identity/README.md](../../services/identity/README.md); `zone_a` ב-[`001_zones.ts`](../../apps/web/db/migrations/001_zones.ts) | stub + דמו DB |
| A | מתאמי זהות T0/T1/T2 | [ADR-0019](../decisions/0019-modular-identity-tiers-anonymous-vote-core.md); [`crypto.ts`](../../apps/web/lib/crypto.ts) | T2 חלקי בדמו |
| A | מנפיק עיוור | [services/issuer/README.md](../../services/issuer/README.md) | stub; חתימה בדמו |
| — | ארנק לקוח | [apps/mobile](../../apps/mobile); ADR-0017 | סוד/commitment במכשיר (**הנחה:** Secure Enclave) |
| גבול | OHTTP relay | [T-110](../roadmap/backlog.md); [`relay.ts`](../../apps/web/lib/relay.ts) | בטא: relay שלנו; ייצור: OHTTP (ADR-0019 §12) |
| B | בונה קבוצות (epoch) | [ארכיטקטורה §4](README.md#4-זרימת-הנפקת-אישור-epoch) | **אין** חבילה נפרדת – מתוכנן עם ADR-0017 |
| B | שירות הצבעה + לוג | [services/voting/README.md](../../services/voting/README.md); [`service.ts`](../../apps/web/lib/service.ts) | nullifier, תור, flush |
| B | שירות תוצאות | [services/results/README.md](../../services/results/README.md); [`results.ts`](../../apps/web/lib/results.ts) | k, buckets, blackout |
| C | API gateway | `apps/web` (Next.js routes) | קריאה ציבורית + API פנימי |
| C | תוכן | [services/content/README.md](../../services/content/README.md); `zone_c` | פורומים, פוסטים |
| C | מודרציה | [services/moderation/README.md](../../services/moderation/README.md); `/admin` | stub + UI |
| C | קונפיג (CFG) | [packages/config](../../packages/config); [ADR-0022](../decisions/0022-global-configuration-layer.md) | IL, blackout, k |
| C | ייבוא נתונים | [services/historical-data](../../services/historical-data); T-301 OData | היסטורי + ingestion עתידי |
| C | פורטל מנהלים | [`apps/web/app/admin`](../../apps/web/app/admin) | ban, polls, audit |
| חוצה | Sentry | [ADR-0026](../decisions/0026-error-reporting-sentry.md); [`error-reporting.md`](../privacy/error-reporting.md) | scrubbers |
| חוצה | אנליטיקת מוצר | [ADR-0008](../decisions/0008-no-advertising.md) | מצרפי בלבד (**הנחה:** כלי TBD) |
| חוצה | CI / אספקה | [ci-cd.md](../engineering/ci-cd.md); [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) | gitleaks, lint |

**גבול קריטי (ADR-0007 §4):** אין קריאת שרת↔שרת בין A ל-B; המכשיר + relay הם הגשר היחיד ([README §2](README.md#2-תמונת-מערכת-c4--רמה-2)).

## 3. מתודולוגיה STRIDE

| אות | קטגוריה | שאלה |
|---|---|---|
| **S** | Spoofing (זיוף) | מי יכול להתחזות לישות/שירות? |
| **T** | Tampering (שיבוש) | מי יכול לשנות נתונים בדרך או במנוחה? |
| **R** | Repudiation (הכחשה) | האם פעולה רגישה ניתנת לעקיבות בלי קישור לזהות? |
| **I** | Information disclosure (חשיפת מידע) | מה עלול לדלוף מעבר לנדרש? |
| **D** | Denial of service (מניעת שירות) | מה משבית זמינות או שלמות תפעולית? |
| **E** | Elevation of privilege (הרחבת הרשאות) | מי יכול לעקוף הפרדה או לקבל גישה אסורה? |

<a id="stride-by-service"></a>

## 4. STRIDE לפי שירות

לכל שירות: תיאור זרימה/גבול, ואז טבלת STRIDE. עמודת **סטטוס** מתייחסת למיטיגציה העיקרית.

<a id="svc-kyc-external"></a>

### 4.1 ספק KYC (חיצוני)

<!-- service:kyc-external -->

**זרימה וגבול אמון:** המכשיר שולח מסמך+סלפי+ liveness לספק חיצוני; הספק מחזיר למפעיל GeoPoll רק תוצאת אימות + מטא-דאטה מינימלי (ADR-0007). גבול אמון: הספק הוא processor נפרד; **דורש אימות** חוזי zero-retention.

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | תוקף מזייף callback KYC לשירות הזהות | חתימה/Webhook מאומת מהספק, TLS, allow-list IP (**הנחה**) | מתוכנן (T-105) | endpoint חשוף בבטא | גבוה |
| **T** | שינוי תוצאת "מאושר" ב-transit | TLS; אימות חתימת ספק | מתוכנן (T-105) | MITM על מכשיר compromized | גבוה |
| **R** | ספק/מפעיל מכחיש שאימות בוצע | לוג אגרגטי "אימות הצליח/נכשל" בלי ביומטריה (ADR-0007 §3) | מתוכנן (T-105) | אין ראיה משפטית חוזית עד חוזה | בינוני |
| **I** | דליפת תמונות/ביומטריה מהספק | zero-retention, מחיקה מיידית (ADR-0007 §3, §5) | ADR-0007 | **דורש אימות** לכל ספק (T-104) | קритי |
| **D** | השבתת API KYC ביום בחירות | ספק משני (**הנחה**); תור והודעה למשתמש | מתוכנן | עיכוב הרשמה | בינוני |
| **E** | עובד ספק מריץ אימותים ללא בקשה | SOC2/ISO של ספק; מינימום scope | **דורש אימות** | תלות בספק | גבוה |

<a id="svc-identity-service"></a>

### 4.2 שירות זהות (תחום A)

<!-- service:identity-service -->

**זרימה וגבול:** שומר `account_hash`+epoch, HMAC מסמך (**מתוכנן**), "זכאי/נוצל" לנפיקה; **אסור** commitment/nullifier/IP ([`services/identity`](../../services/identity/README.md), [ADR-0007 §4](README.md#3-גבולות-שירותים)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | קריאה מזויפת "מאושר" למנפיק | mTLS פנימי + auth בין שירותים (**הנחה**) | מתוכנן (T-105) | — | גבוה |
| **T** | שינוי `token_issuance` / סימון "נוצל" | DB role `zone_a` בלבד; [`002_roles`](../../apps/web/db/migrations/002_roles.ts) | מיושם (דמו) | DBA זדוני | גבוה |
| **R** | הכחשת הנפקה כפולה | רשומת "נוצל" ל-epoch; ללא קישור ל-commitment (ADR-0007) | ADR-0007 | לא מוכיח זהות אדם בבית משפט | בינוני |
| **I** | קישור hash↔אדם דרך לוגים | אין IP/זמן מדויק (ADR-0007 §4); log hygiene | מתוכנן + **הנחה** | שמירת account_hash | גבוה |
| **D** | הצפת בקשות זכאות | rate limit (**הנחה**) | מתוכנן (T-105) | — | בינוני |
| **E** | תפקיד B קורא `zone_a` | סכמות נפרדות, בלי FK ([`001_zones`](../../apps/web/db/migrations/001_zones.ts)); boundary-check (**תבנית** CI) | מיושם (דemo schema) | אותו Postgres בדמו | גבוה |

<a id="svc-identity-adapters"></a>

### 4.3 מתאמי זהות (T0/T1/T2…)

<!-- service:identity-adapters -->

**זרימה:** Google OIDC (T-108), HMAC ת"ז (T-109), KYC→T2; פלט tier בלבד לליבת הצבעה ([ADR-0019](../decisions/0019-modular-identity-tiers-anonymous-vote-core.md)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | Sybil: חשבונות Google רבים (T0) | תיוג "רמה בסיסית" ([`results.ts`](../../apps/web/lib/results.ts)); שדרוג ל-T2 | מיושם (תיוג) | T0 לא "אדם אחד" | גבוה |
| **T** | זיוף tier גבוה בטוקן | מפתח נפרד לכל tier ([`crypto.ts`](../../apps/web/lib/crypto.ts) ADR-0019 §2) | מיושם (דמו) | גניבת מפתח T2 | קритי |
| **R** | הכחשת רישום T1 | audit aggregate בלבד | מתוכנן (T-108) | — | נמוך |
| **I** | דליפת מייל Google / HMAC ת"ז | feature flag מייל; HMAC ב-KMS (ADR-0019 §6) | מתוכנן; **needs-lawyer** | עד חוות דעת | קритי |
| **D** | עומס על OAuth | rate limit IdP | **הנחה** | — | בינוני |
| **E** | T0 token מאפשר הצבעה "מאומתת" | `assurance: basic` בפלט | מיושם | UX מטעה אם תיוג חלש | בינוני |

<a id="svc-blind-issuer"></a>

### 4.4 מנפיק עיוור

<!-- service:blind-issuer -->

**זרימה:** בקשה מעוורת → שאילתה לזהות "זכאי?" → חתימה עיוורת באצווה ([ADR-0017](../decisions/0017-anonymous-credential-scheme.md), T-106).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | שרת מנפיק מזויף | pin/spki של מפתח issuer בלקוח (**הנחה**) | מתוכנן (T-101) | — | קритי |
| **T** | שינוי פרמטרי חתימה | מפתח ב-HSM; threshold 3-of-5 (**הנחה**) | מתוכנן (T-106) | מפתח T0 ב-env בדמו | קритי |
| **R** | הכחשת הנפקה | counters אגרגטיים; לא שומרים plaintext credential (ADR-0007) | ADR-0007 | — | בינוני |
| **I** | correlating issuance requests | אצוות + jitter (ADR-0007 §4); בלי IP | מתוכנן (T-106) | גודל אצווה TBD | גבוה |
| **D** | עיכוב הנפקה אינסופי | SLA + תור (**הנחה**) | מתוכנן | מניעת הצבעה | בינוני |
| **E** | מפתח issuer ב-env production | HSM/KMS; אין `ISSUER_PRIVATE_JWK` ב-repo | מיושם (gitleaks); דemo keys | T6 | קритי |

<a id="svc-client-wallet"></a>

### 4.5 ארנק לקוח (מכשיר)

<!-- service:client-wallet -->

**זרימה:** שמירת סוד, commitment, בניית הוכחה/nullifier, שליחה דרך relay ([ADR-0017](../decisions/0017-anonymous-credential-scheme.md), [apps/mobile/src/core/vote.ts](../../apps/mobile/src/core/vote.ts)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | malware שולח הצבעות בשם המשתמש | סוד ב-Secure Enclave (**הנחה**); OS attestation (**הנחה**) | מתוכנן (T-501) | מכשיר rooted | גבוה |
| **T** | שינוי בחירה לפני שליחה | הוכחת ZK כוללת בחירה (**הנחה** PoC) | מתוכנן (T-101) | דemo ללא ZK מלא | גבוה |
| **R** | משתמש מכחיש שהצביע | by design: אין receipt transferable (T-207) | מתוכנן | כפייה (T7) | בינוני |
| **I** | גיבוי iCloud/Android חושף סוד | exclude from backup (**הנחה**) | מתוכנן (T-501) | — | גבוה |
| **D** | crash לפני שליחה | תור offline ([ADR-0025](../decisions/0025-native-wrapper.md)) | **הנחה** | — | נמוך |
| **E** | אפליקיה זדונית קוראת סוד | sandbox OS; אין export API | **הנחה** | — | גבוה |

<a id="svc-ohttp-relay"></a>

### 4.6 OHTTP relay

<!-- service:ohttp-relay -->

**זרימה:** מכשיר → relay → vote API; הסרת IP/headers ([`relay.ts`](../../apps/web/lib/relay.ts), T-110). ייצור: OHTTP RFC 9458 (ADR-0019 §12).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | הצבעה ישירות ל-vote API | `RELAY_ONLY` + `viaRelay()` | מיושם | secret leak | גבוה |
| **T** | שינוי גוף הצבעה | JSON only; גודל מוגבל `MAX_BODY` | מיושם | — | בינוני |
| **R** | relay מכחיש העברה | **הנחה:** no logs (קוד); OHTTP operator audit | מיושם (policy בקוד) | מפעיל relay רואה IP בייצור | גבוה |
| **I** | מפעיל relay מתאם IP↔זמן הצבעה | OHTTP צד שלישי; padding (**הנחה**) | מתוכנן (T-110); **needs-lawyer** B6 | בטא: אותו מפעיל edge | קритי |
| **D** | flood על relay | rate limit CDN (**הנחה**) | מתוכנן | — | בינוני |
| **E** | relay secret חושף bypass | `timingSafeEqual`; secret ב-KMS | מיושם | — | גבוה |

<a id="svc-group-builder"></a>

### 4.7 בונה קבוצות (epoch)

<!-- service:group-builder -->

**זרימה:** קליטת commitments לתקופה; rebuild בתחילת epoch; Semaphore (**הנחה** ADR-0017). **אין** מימוש עדיין – רק ארכיטקטורה.

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | commitment מזויף ברשימה | חתימת issuer + Merkle proof (**הנחה** PoC) | מתוכנן (T-101) | — | גבוה |
| **T** | הוצאת/הוספת commitment | append-only log קבוצות; hash chain (**הנחה**) | מתוכנן | — | גבוה |
| **R** | הכחשת חברות בקבוצה | root מתפרסם לציבור (**הנחה** ADR-0014) | מתוכנן | — | בינוני |
| **I** | רשימת commitments קטנה מזהה | חלון הצטרפות; k לפני הצבעה | ADR-0007 | קבוצות קטנות בבטא | גבוה |
| **D** | rebuild איטי חוסם epoch | async job (**הנחה**) | מתוכנן | — | בינוני |
| **E** | admin משנה root | RBAC נפרד B; אין `/admin` על B | **הנחה** | — | גבוה |

<a id="svc-voting-service"></a>

### 4.8 שירות הצבעה (+ לוג append-only)

<!-- service:voting-service -->

**זרימה:** אימות token/tier, nullifier, enqueue → flush ל-`ballots` + snapshots ([`service.ts`](../../apps/web/lib/service.ts), [`store.ts`](../../apps/web/lib/store.ts)). לוג: `ballots` + `snapshots` (append-oriented).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | הצבעה עם token גנוב | verify JWT/credential ([`crypto.ts`](../../apps/web/lib/crypto.ts)) | מיושם (דemo) | — | גבוה |
| **T** | שינוי `option_id` ב-DB | role `zone_b`; migrations | מיושם (schema) | admin DB | קритי |
| **R** | הכחשת קליטת קול | append-only intent; **בלי** זהות (by design) | ADR-0007 | לא עוזר לתביעות משתמש | נמוך |
| **I** | `day_bucket` + timing leak | bucket יום בלבד ([`001_zones`](../../apps/web/db/migrations/001_zones.ts)) | מיושם (דemo) | flush time correlates | גבוה |
| **D** | הצפת nullifiers | rate limit (**הנחה**) | מתוכנן (T-201) | T8 | בינוני |
| **E** | API מחזיר ספירה גולמית | אין endpoint מתחת ל-k ([architecture §6](README.md#6-תוכן-מודרציה-ו-api)) | מיושם (`toPublic`) | bypass bug | קритי |

<a id="svc-results-service"></a>

### 4.9 שירות תוצאות

<!-- service:results-service -->

**זרימה:** tally פנימי → `toPublic` (k, buckets, rounding, assurance, blackout) ([`results.ts`](../../apps/web/lib/results.ts), ADR-0012).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | API מזייף snapshot | חתימה על snapshot (**הנחה** ADR-0014) | מתוכנן | — | גבוה |
| **T** | שינוי `snapshots.body` | role B; CI property tests (T-203) | מתוכנן (T-203) | — | קритי |
| **R** | הכחשת פרסום | `snapshotAt` + שקיפות (**הנחה**) | מתוכנן (T-603) | — | בינוני |
| **I** | פרסום מתחת ל-k | `published: false`; tests | מיושם (unit logic) | differencing §7 | גבוה |
| **D** | batch worker down | cron [`batch-worker.ts`](../../apps/web/scripts/batch-worker.ts) | מיושם (dev) | תוצאות ישנות | בינוני |
| **E** | עקיפת blackout | `isBlackout` + `blackoutResults` ([`blackout.ts`](../../packages/config/src/blackout.ts)) | מיושם | **needs-lawyer** L2/L3 | קритי |

<a id="svc-api-gateway"></a>

### 4.10 API gateway (apps/web)

<!-- service:api-gateway -->

**זרימה:** Next.js routes – vote relay, results read, content; middleware ([`middleware.ts`](../../apps/web/middleware.ts)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | SSRF פנימה ל-zone A | אין routes A→B משותפים | מיושם (design) | misconfig | גבוה |
| **T** | cache poisoning תוצאות | `Cache-Control: no-store` (**הנחה**) | **הנחה** | — | בינוני |
| **R** | repudiation of API access | N/A לקריאה ציבורית | — | — | — |
| **I** | verbose errors | scrub stacks prod | **הנחה** | — | בינוני |
| **D** | HTTP flood | Vercel/CDN limits | **הנחה** | T8 | בינוני |
| **E** | path traversal ל-admin | session admin ([`admin.ts`](../../apps/web/lib/admin.ts)) | מיושם (דemo) | weak secret | גבוה |

### 4.11 שירות תוכן

<!-- service:content-service -->

**זרימה:** `zone_c.posts`; author_hash נפרד מ-zone A ([`001_zones`](../../apps/web/db/migrations/001_zones.ts)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | impersonation בפורום | author_hash + display name | מיושם (דemo) | — | בינוני |
| **T** | שינוי פוסט | soft delete; audit (**הנחה**) | חלקי | — | בינוני |
| **R** | הכחשת פרסום | timestamps | מיושם | — | נמוך |
| **I** | קישור author_hash A↔C | מפתחות HMAC שונים (schema comment) | מיושם (דemo) | same user chooses same nickname | בינוני |
| **D** | spam posts | rate limit (**הנחה**) | מתוכנן (T-302) | — | בינוני |
| **E** | קריאה ל-ballots | אין FK; stores מבודדים ([`store.ts`](../../apps/web/lib/store.ts)) | מיושם | code bug | גבוה |

### 4.12 שירות מודרציה

<!-- service:moderation-service -->

**זרימה:** דיווחים → תור → החלטה → שקיפות (T-303); admin tab mod.

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | moderator מזויף | sessionAdmin | מיושם (דemo) | — | גבוה |
| **T** | מחיקת דעה שלא הפרה | עקרון 4; audit log | מתוכנן (T-303) | bias | בינוני |
| **R** | הכחשת הסרה | audit trail | מתוכנן (T-303) | — | בינוני |
| **I** | moderator רואה קול | **אסור** by design | ADR | — | קритי |
| **D** | flood דיווחים | dedupe reporter_hash | מיושם (schema) | — | נמוך |
| **E** | ban מקשר לזהות | ban על author_hash בלבד ([`store.ts`](../../apps/web/lib/store.ts)) | מיושם | — | בינוני |

<a id="svc-config-cfg"></a>

### 4.13 קונפיגורציה מדינתית (CFG)

<!-- service:config-cfg -->

**זרימה:** `packages/config` → blackout, k, buckets, polls ([`il.ts`](../../packages/config/src/il.ts), ADR-0022).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | — | config signed release (**הנחה**) | **הנחה** | — | — |
| **T** | env דורס blackout | ADR-0022: אין override משפטי מ-env | ADR-0022 | mis-deploy | קритי |
| **R** | הכחשת שינוי תאריך בחירות | git history + ADR | מיושם (repo) | — | בינוני |
| **I** | חשיפת `GEOPOLL_*` secrets | לא ב-repo; admin shows flags only | מיושם ([`admin.ts`](../../apps/web/lib/admin.ts)) | — | בינוני |
| **D** | — | — | — | — | — |
| **E** | CRON bypass blackout | `CRON_SECRET` on batch | **הנחה** | leaked secret | גבוה |

### 4.14 ייבוא נתונים (historical-data + OData)

<!-- service:data-importers -->

**זרימה:** `services/historical-data` – CSV knesset; T-301 OData עתידי.

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | supply chain ב-OData | HTTPS knesset.gov.il | מיושם (importer) | — | נמוך |
| **T** | poisoned CSV | sha256 manifest ([`manifests/knesset.json`](../../services/historical-data/manifests/knesset.json)) | מיושם | — | בינוני |
| **R** | — | — | — | — | — |
| **I** | נתונים היסטוריים מזהים בוחרים | aggregate results only | מיושם | — | נמוך |
| **D** | import שובר CI | tests offline | מיושם ([`historical-data.yml`](../../.github/workflows/historical-data.yml)) | — | נמוך |
| **E** | importer כותב zone B | importer ל-C/תוכן בלבד | design | bug | בינוני |

### 4.15 פורטל מנהלים

<!-- service:admin-portal -->

**זרימה:** `/admin` – polls, mod, audit ([`admin/page.tsx`](../../apps/web/app/admin/page.tsx)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | גישה לא מורשית | sessionAdmin | מיושם (דemo) | shared password | קритי |
| **T** | שינוי תוצאות via admin | admin לא כותב snapshots (**הנחה**) | **הנחה** | verify code paths | קритי |
| **R** | פעולה ללא audit | audit tab; T-303 | חלקי | **needs-lawyer** K6 | בינוני |
| **I** | dashboard חושף PII | stats aggregate ([`admin.ts`](../../apps/web/lib/admin.ts)) | מיושם | t2Count bucket | בינוני |
| **D** | — | — | — | — | — |
| **E** | admin → zone A keys | read-only flags; no export keys | מיושם (dashboard) | — | גבוה |

### 4.16 תצפיתיות (Sentry)

<!-- service:observability-sentry -->

**זרימה:** crash reports עם scrub ([ADR-0026](../decisions/0026-error-reporting-sentry.md), [`scrub.ts`](../../apps/mobile/src/core/scrub.ts)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | שליחת events מזויפת | DSN secret; rate limit Sentry | **הנחה** | — | נמוך |
| **T** | tamper stack | — | — | — | — |
| **R** | — | — | — | — | — |
| **I** | vote/nullifier ב-stack | scrubber + tests | מיושם | novel leak path | גבוה |
| **D** | Sentry down | no impact on vote | design | — | נמוך |
| **E** | overly broad PII setting | `sendDefaultPii: false`; org scrub | ADR-0026 | US transfer **needs-lawyer** | בינוני |

### 4.17 אנליטיקת מוצר

<!-- service:product-analytics -->

**זרימה:** אירועים מצרפיים בלבד (ADR-0008); **אין** SDK פרסום.

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | — | — | — | — | — |
| **T** | — | — | — | — | — |
| **R** | — | — | — | — | — |
| **I** | funnel מזהה מצביע | no vote events (**הנחה**) | ADR-0008 | tool TBD | גבוה |
| **D** | — | — | — | — | — |
| **E** | marketer adds tracker | ADR-0008; lint deps | ADR-0008 | human bypass | בינוני |

<a id="svc-ci-supply-chain"></a>

### 4.18 CI/CD ושרשרת אספקה

<!-- service:ci-supply-chain -->

**זרימה:** [`ci.yml`](../../.github/workflows/ci.yml) – lint, tests, gitleaks; templates ל-CodeQL/SBOM ([ci-cd.md](../engineering/ci-cd.md)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | malicious PR | branch protection (**human** T-001) | מתוכנן | — | גבוה |
| **T** | compromised dependency | dependabot; review (**תבנית**) | חלקי | T-004 lawyer | גבוה |
| **R** | — | signed commits (**הנחה**) | **הנחה** | — | — |
| **I** | secret in PR | gitleaks | מיושם | — | גבוה |
| **D** | CI noise | — | — | — | נמוך |
| **E** | workflow write token | `contents: read` docs | מיושם (docs.yml) | ci.yml permissions | בינוני |

### 4.19 לקוח מובייל

<!-- service:mobile-client -->

**זרימה:** Expo app – polls, vote, relay, Sentry ([`apps/mobile`](../../apps/mobile)).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | fake app store binary | official signing EAS | **הנחה** | — | גבוה |
| **T** | MITM API | TLS pinning (**הנחה**) | **הנחה** | — | בינוני |
| **R** | — | — | — | — | — |
| **I** | logs on device | scrub; no PII logs | [`scrub.test.ts`](../../apps/mobile/tests/scrub.test.ts) | dev logging | בינוני |
| **D** | — | — | — | — | — |
| **E** | WebView bridge | minimal native surface | design | — | בינוני |

### 4.20 לקוח ווב

<!-- service:web-client -->

**זרימה:** Next.js read/vote; browser storage (**הנחה**).

| | איום | מיטיגציה | סטטוס | שארית | חומרה |
|---|---|---|---|---|---|
| **S** | XSS steals session | CSP (**הנחה**) | **הנחה** | — | גבוה |
| **T** | MITM | HTTPS | מיושם | — | בינוני |
| **R** | — | — | — | — | — |
| **I** | localStorage token | httpOnly cookies (**הנחה**) | **הנחה** | — | בינוני |
| **D** | — | — | — | — | — |
| **E** | browser ext reads DOM | minimize sensitive DOM | **הנחה** | — | בינוני |

---

## 5. מפת T1–T12 ↔ שירותים

| איום | שירותים עיקריים |
|---|---|
| T1 | identity, issuer, wallet, relay, voting |
| T2 | identity-adapters, KYC |
| T3 | issuer, group-builder, relay, voting (flush) |
| T4 | results, config (k/buckets) |
| T5 | KYC |
| T6 | blind-issuer |
| T7 | voting (re-vote T-206) |
| T8 | api-gateway, voting, relay |
| T9 | wallet, identity |
| T10 | config-cfg, results, voting |
| T11 | results, identity (teen) |
| T12 | ci-supply-chain |

<a id="timing-correlation"></a>

## 6. מתאם זמנים ודה-אנונימיזציה

### 6.1 מודל תוקף

| תוקף | יכולת | מה רואה היום (בטא) |
|---|---|---|
| מפעיל GeoPoll | לוגים DB, edge Vercel | `day_bucket` בלבד ב-B; relay comment: IP at edge if shared infra |
| מפעיל relay (עתידי) | IP, timing OHTTP | ADR-0019: Cloudflare/Fastly **אפשרויות**, לא החלטה |
| צופה רשת (ISP) | timing, volume | traffic to app/realy |
| משתמש מקומי | מכשיר עצמו | issuance + vote times locally |

### 6.2 נקודות מתאם

1. **הנפקה ↔ הצבעה:** אם שני האירועים נצפים ברזולוציה של שניות, קורלציה מצמצמת anonymity set (T3 → T1).
2. **הנפקה ↔ הצטרפות לקבוצה:** commitments נשלחים בחלון epoch ([architecture §4](README.md#4-זרימת-הנפקת-אישור-epoch)).
3. **Flush batch ↔ הצבעה:** [`runBatch`](../../apps/web/lib/service.ts) + `BATCH_INTERVAL_SECONDS` ([`batch-worker.ts`](../../apps/web/scripts/batch-worker.ts)) – מי שיודע זמן flush מדויק + traffic shape יכול לצמצם מועמדים.
4. **Network metadata:** גודל payload, TLS fingerprint (**הנחה**).

### 6.3 תרחישי התקפה (concrete)

| # | תרחיש | תנאי | השפעה |
|---|---|---|---|
| TC-1 | **Same-session correlation:** KYC מסתיים 14:00:01, vote 14:00:45, אותו ASN | מפעיל relay+edge | מקטין קבוצת מועמדים ל"מי שהנפיק בדקה האחרונה" |
| TC-2 | **Batch boundary:** 3 votes ב-flush אחד; תוצאות bucket קופצות ב-`snapshotAt` | ציבור רואה snapshots | מקשר vote לשינוי bucket אם k קרוב |
| TC-3 | **Epoch edge:** commitment אחרון לפני rebuild + vote מיד אחרי | group קטן | deanonymization within small Semaphore group |
| TC-4 | **OHTTP operator:** רואה IP→gateway timing אך לא body (RFC 9458 **הנחה**) | relay צד ג' | T1 אם gateway logs correlate with internal queue |

### 6.4 מיטיגציות (מיושם / מתוכנן / **הצעה לבעלים**)

| מיטיגציה | מקור | סטטוס |
|---|---|---|
| אין IP ב-zone B | ADR-0007; relay strips headers | relay מיושם; vote DB מיושם |
| day_bucket בלבד | [`001_zones`](../../apps/web/db/migrations/001_zones.ts) | מיושם (דemo) |
| epoch משותף (לא טיימר אישי) | ADR-0019 §8 | ADR |
| הנפקה באצווה + jitter | ADR-0007 §4; T-106 | מתוכנן |
| OHTTP מפעיל נפרד | ADR-0019 §12; T-110 | מתוכנן |
| **הצעה:** מינימום N issuances לפני flush של אצווה הנפקה | — | **הצעה – TBD** (owner) |
| **הצעה:** השהיה אקראית 0–Δ לפני שליחת vote מהמכשיר | — | **הצעה – TBD** (owner) |
| **הצעה:** padding גודל payload קבוע | — | **הצעה – TBD** (owner) |

> **הנחה:** ערכים מספריים (N, Δ, גודל אצווה מינימלי) **לא** נקבעו בריפו – כל proposal דורש החלטת נוה + מדידה ב-T-101/T-106.

<a id="differencing"></a>

## 7. התקפות הפרש (differencing)

### 7.1 מודל פרסום (ADR-0012)

- אין ספירות מדויקות; buckets (`bucket()`), אחוזים מעוגלים (`roundingPercent` ב-[`il.ts`](../../packages/config/src/il.ts)).
- עדכון באצוות (`BATCH_INTERVAL_SECONDS`, T-203) – לא real-time.
- DP רק בפילוחים / רישוי (T-204, ADR-0009) – **לא** על תוצאה כללית.

### 7.2 תרחישי התקפה

| # | תרחיש | מנגנון | דוגמה |
|---|---|---|---|
| DF-1 | **Two-snapshot diff** | משווה `participants` bucket ואחוזים בין `snapshotAt` t1→t2 | אם bucket עלה מ-"50+" ל-"1,000+" עם שינוי 1% באופציה, מסיקים על כ-950 קולות (**הנחה** – תלוי גבולות TBD) |
| DF-2 | **Small poll crossing k** | `total < k` → `published: false`, then true | Observer רואה מעבר לפרסום ראשון – מסיק מינימום k משתתפים |
| DF-3 | **Rounding lattice** | אחוזים שלמים בלבד | שני polls עם אותו total מעוגל – מסיקים total אמיתי מתוך סט אפשרויות |
| DF-4 | **Demographic slice (עתיד)** | DP noise (T-204) | **needs-lawyer** ADR-0009; ε TBD |
| DF-5 | **Revote (T-206)** | nullifier replace | שינוי תוצאה בלי עלייה ב-participants – מסיקים replace לא vote חדש |

### 7.3 מיטיגציות ופרמטרים

| פרמטר | ערך בריפו | מיטיגציה | הערה |
|---|---|---|---|
| k ארצי | 50 ([`il.ts`](../../packages/config/src/il.ts)) | ADR-0012 | לא לשנות בלי ADR |
| k רשות קטנה | 100 | ADR-0012 | שלב 2 |
| buckets | `[50,100,500,1000,...]` config | ADR-0012 | גבולות TBD חלקית |
| rounding | whole percent (**הנחה**) | [`results.ts`](../../apps/web/lib/results.ts) | TBD |
| batch interval | env default 3600s | [`batch-worker`](../../apps/web/scripts/batch-worker.ts) | **הצעה:** לא לפרסם snapshot אם Δvotes < m (**m TBD**) |
| DP ε | — | T-204 | **needs-lawyer** + ADR |

### 7.4 **הצעות לבעלים (דורש החלטה – לא מיושם)**

1. **מינימום Δ לפני פרסום snapshot חדש** (m קולות או Δt מינימלי) – מפחית DF-1/DF-2.
2. **רandomized batch delay** ב-`runBatch` (jitter אחיד בטווח TBD) – מקשה על TC-2/DF-1.
3. **שיתוף/chart cards** – רק buckets+עיגול ([T-502](../roadmap/backlog.md)); איסור export CSV גולמי.
4. **ניתוח פורמלי** (T-101 / external audit) על שילוב k+buckets+rounding – backlog E1 follow-up.

## 8. החלטות ושאלות פתוחות לבעלים (נוה)

| # | נושא | סוג | הערה |
|---|---|---|---|
| O1 | גודל אצווה מינימלי הנפקה + jitter | אבטחה | ADR-0007 §4; קשור T-106 |
| O2 | Δ השהיה אקראית לפני vote / padding payload | אבטחה | §6.4 |
| O3 | m – מינימום שינוי לפני snapshot (DF) | אבטחה/UX | §7.4 |
| O4 | ספק OHTTP (Cloudflare/Fastly/אחר) | תפעול + **needs-lawyer** B6 | ADR-0019 §12 |
| O5 | threshold מפתח 3-of-5 + HSM vendor | אבטחה | T6 **הנחה** |
| O6 | תדירות liveness מחדש | אבטחה | ADR-0007 |
| O7 | ε DP לפילוחים | אבטחה + **needs-lawyer** | T-204 |
| O8 | חלון איסור – פרשנות L2/L3 | **needs-lawyer** | T-202, T-601 |
| O9 | שמירת audit admin / ban appeals | **needs-lawyer** K6 | `/admin` |
| O10 | מיקום נתונים / העברה לחו"ל | **needs-lawyer** | architecture §9 |

## 9. עקיבות ותחזוקה

- בדיקה אוטומטית: [`scripts/ci/threat-model-stride.mjs`](../../scripts/ci/threat-model-stride.mjs) (workflow `docs.yml`).
- עדכון נדרש כש: נוסף שירות ב-[architecture README](README.md#3-גבולות-שירותים), או ADR משנה g/b/blackout/k.
- מודל זה **לא** מחליף DPIA (T-601) או penetration test חיצוני.
