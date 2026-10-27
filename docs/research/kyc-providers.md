# מחקר: ספקי אימות זהות (KYC) ל-T2, ו-ZK passport / NFC כאפשרות החזקה

- **תאריך:** 2026-10-27 · **כותב:** CTO (סוכן) · **מטרה:** בסיס להחלטת ספק ל-T2 ([ADR-0024](../decisions/0024-t2-document-liveness-kyc.md), מוצע).
- **אזהרה:** הסקירה מבוססת על ידע כללי ותיעוד ציבורי. **לא פניתי לאף ספק**, לא נרשמתי לשירות ולא קיבלתי הצעת מחיר. כל מחיר, כיסוי מסמכים ותנאי שמירה מסומנים **דורש אימות** עד שנוה מאשר פנייה לספקים.

## 1. מה T2 צריך (לפי ADR-0007, ADR-0019)
1. אימות שמסמך ישראלי (ת"ז ביומטרית / דרכון) אמיתי ושייך לאדם החי שמול המצלמה (התאמת פנים + liveness).
2. **הפלט היחיד שיוצא מהספק אלינו:** "עבר/נכשל" + מזהה dedupe מגובב (HMAC של מספר המסמך) כדי למנוע שני חשבונות לאדם אחד. **בלי** שם, תמונה, תאריך לידה מלא או ביומטריה (AGENTS §2.2).
3. מחיקת תמונות ונתונים ביומטריים אצל הספק מיד אחרי ההחלטה (או בחלון קצר וחוזי).
4. אצלנו: שום תמונה לא נשמרת. התמונה עוברת ישירות מהדפדפן לספק (SDK), או, במוק, נמחקת מהזיכרון בסוף הבקשה.
5. הטוקן נחתם במפתח T2 נפרד (`ISSUER_PRIVATE_JWK_T2`), כך שתחום B לומד רק "T2" ולא איזה ספק.

## 2. השוואת ספקים

| ספק | ת"ז/דרכון ישראלי | liveness | שמירת נתונים / פרטיות | מחיר (סדר גודל) | הערות לחוק הישראלי |
| --- | --- | --- | --- | --- | --- |
| **Persona** | דרכון כן; ת"ז ביומטרית – **דורש אימות** | פסיבי + אקטיבי | retention ניתן להגדרה לכל template, כולל מחיקה אוטומטית (**דורש אימות** חלון מינימלי) | לפי שימוש, ~1–2$ לאימות (**דורש אימות**) | שרתים בארה"ב/EU; העברה לחו"ל (תיקון 13) |
| **Onfido (Entrust)** | דרכון כן; ת"ז ישראלית מופיעה ברשימת מסמכים נתמכים – **דורש אימות** | Motion (אקטיבי) | אזורי אחסון EU/US/CA; retention חוזי | חוזה שנתי, ~1.5–3$ לבדיקה (**דורש אימות**) | DPA זמין; עיבוד ביומטרי באנגליה/EU |
| **Veriff** | דרכון כן; ת"ז ישראלית – **דורש אימות** | כן, כולל וידאו | EU (אסטוניה); retention מוגדר | יש תוכנית self-serve, ~1–2$ (**דורש אימות**) | GDPR-first; נוח להעברה מ-EU (לישראל יש הכרת הלימות EU) |
| **Sumsub** | כיסוי רחב, כולל ת"ז ישראלית – **דורש אימות** | כן | אחסון EU/בחירה; retention ארוך כברירת מחדל ל-AML – צריך לקצר | זול יחסית, self-serve (**דורש אימות**) | מכוון AML/פינטק; לבדוק שאפשר לכבות שמירה |
| **AU10TIX** (ישראלית) | חזק במסמכים ישראליים (**הנחה**, לפי מוצאה) | כן | מפעילה גם בישראל (**דורש אימות**) | חוזה ארגוני, ללא self-serve (**הנחה**) | אחסון בישראל אפשרי → פחות העברה לחו"ל (**דורש אימות**) |
| **Self-hosted** (OCR + face match קוד פתוח, למשל MRZ + מודל השוואת פנים) | MRZ של דרכון כן; ת"ז – חלקי | liveness קוד פתוח חלש מול deepfake | שליטה מלאה, אבל **אנחנו** מעבדים ביומטריה (מנוגד לרוח §2.2) | ללא רישוי, עלות הנדסה ותחזוקה גבוהה | אחריות מלאה על אבטחת מידע ביומטרי (רגיש במיוחד) |
| **NFC eMRTD** (קריאת שבב בדרכון/ת"ז ביומטרית בטלפון) | דרכון ישראלי ביומטרי – ICAO 9303 (**הנחה**); ת"ז ביומטרית – **דורש אימות** תאימות | התאמת תמונת השבב לסלפי | Passive Authentication מוכיח שהנתונים חתומים ע"י המדינה; לא צריך לשמור תמונה | ספריות קוד פתוח / ספקים (ReadID, Inverid) – **דורש אימות** | חזק ביותר נגד זיוף; דורש אפליקציה נייטיב (Web NFC לא קורא eMRTD) |
| **ZK passport** (Self / zkPassport / OpenPassport) | דרכון ביומטרי עם שבב | הוכחה על השבב, אופציונלי סלפי | **אין** מסירת נתונים: הוכחת אפס ידיעה ("מעל 18, אזרח IL, nullifier ייחודי") | קוד פתוח, אפליקציה של צד ג' | פרטיות מקסימלית; לבדוק אם CSCA של ישראל נתמך (**דורש אימות**). ראו [zk-passport-identity](zk-passport-identity.md) |

## 3. המלצה (טיוטה, לאישור נוה)
1. **ממשק ספק-אגנוסטי עכשיו** (נבנה: `apps/web/lib/identity/t2.ts`), עם ספק מוק מאחורי `FEATURE_T2_KYC=1`. החלפת ספק = adapter חדש, בלי שינוי בתחום B.
2. **ספק KYC ראשון לבטא סגורה:** Veriff או Persona (self-serve, retention ניתן לקיצור, EU). AU10TIX שווה בדיקה בגלל כיסוי ת"ז ואחסון בישראל. **ההחלטה דורשת פנייה לספקים ותשלום – בסמכות נוה.**
3. **המסלול החזק (T3):** ZK passport / NFC כשתהיה אפליקציה נייטיב. נותן "אדם אחד = קול אחד" בלי שהספק או אנחנו רואים נתונים. מתאים לאחרי ההשקה הראשונה.
4. **לא self-hosted** לביומטריה: מכניס אותנו לעיבוד מידע ביומטרי, ובאיכות liveness נמוכה.

## 4. שאלות לעורך דין
נוספו ל-[lawyer-questions](../legal/lawyer-questions.md) בסעיף ח' (K1–K5).

## 5. עדכון 2026-10-27: מסלולים חינמיים (מחקר רשת, בלי הרשמה ובלי פנייה)
מקורות נבדקו ב-27/10/2026. "לא אומת" = לא נמצא מקור רשמי.

| ספק | חינם? | כרטיס אשראי | ת"ז / דרכון IL | מיקום נתונים | איך נרשמים |
| --- | --- | --- | --- | --- | --- |
| **Didit** | 500 בדיקות בחודש לכל אחד מ-ID, passive liveness, face match ו-IP, בלי הגבלת זמן; ה-sandbox לא נספר ([free plan](https://help.didit.me/getting-started/free-plan), [free-kyc](https://didit.me/products/free-kyc/)). NFC בתשלום: 0.15$ | לא נדרש | ת"ז ודרכון (לפי [דף ישראל](https://didit.me/solutions/countries/israel/)) | EU (AWS אירלנד) כברירת מחדל, retention מוגדר מחודש, מחיקה ב-API ([DPA](https://help.didit.me/data-privacy/dpa-and-data-residency), [retention](https://docs.didit.me/console/data-retention)) | self-serve ב-business.didit.me |
| **Persona** | Startup Program: 500 אימותים בחודש ל-12 חודשים, ואחריהם 1$ לאימות ([startups](https://withpersona.com/startups/)). Sandbox חינמי ל-60 יום ([apply](https://help.withpersona.com/articles/5NoQf7ZYBo1aFCsqQgZYf7/)) | לא נדרש לניסיון ([plans](https://help.withpersona.com/articles/6oZbzp7jb7AWGClF5vpY3K.md)) | ת"ז: לא אומת | לא אומת | חשבון, ואז בקשה ל-Startup Program דרך Billing. **חובה חברה רשומה** |
| **Veriff** | ניסיון ל-15 יום, 20 עד 50 סשנים (המקורות סותרים), ו-sandbox ([pricing](https://www.veriff.com/pricing), [addendum](https://www.veriff.com/documents/ss-addendum/ver-ssa-2501)). אחרי זה מינימום 49$ בחודש | לא נדרש | ת"ז: לא אומת | EU (לא אומת מחדש) | self-serve, כולל אימות זהות חובה של בעל החשבון |
| **Sumsub** | ניסיון ל-14 יום, 50 בדיקות ([self-service](https://docs.sumsub.com/docs/self-service)) | **נדרש** כרטיס אשראי, ואחרי הניסיון החיוב אוטומטי. **לא מתאים** | לא אומת | לא אומת | self-serve |
| **iDenfy** | ניסיון ל-14 יום ([trial](https://idenfy.com/free-identity-verification-service/)) | לא נדרש | לא אומת | לא אומת | self-serve |
| **Onfido (Entrust)** | Sandbox חינמי ([sandbox](https://onfido.my.site.com/clientportal/s/article/Sandbox)); production דרך מכירות | לא אומת | לא אומת | EU/US/CA | דרך מכירות |
| **AU10TIX** | הערכה ל-14 יום למשתמש אחד ([evaluation](https://www.au10tix.com/wp-content/uploads/2023/09/Au10tix-Evaluation-Subscription-Services.pdf)) | לא אומת | חזק בישראל (הנחה) | לא אומת | [טופס יצירת קשר](https://www.au10tix.com/contact/) |
| **Self (self.xyz)** | קוד פתוח, חינם | — | **דרכון IL עובד, ת"ז IL נכשלת** (קריאת השבב נכשלת כי ה-MRZ לא תואם; [issue #1962](https://github.com/selfxyz/self/issues/1962)). Israel ברשימת CSCA ([countries](https://docs.self.xyz/self-pass-legacy/countries-list)) | אין העברת נתונים (הוכחת ZK) | SDK, בלי חשבון |
| **zkPassport** | קוד פתוח, חינם | — | Israel ברשימה ([zkMe list](https://docs.zk.me/hub/how-built/id-infra/zkpassport/supported-countries)). ת"ז: לא אומת | אין העברת נתונים | SDK ([limitations](https://docs.zkpassport.id/limitations)) |
| **Rarimo** | לא נבדק בסבב הזה | | | | |
| **Self-hosted face match** | חינם ברישוי | — | — | אצלנו. **נדחה** (ראו §3.4) | — |

### 5.1 שלוש האפשרויות המובילות ותוכנית adapter
כל adapter מממש את הממשק `apps/web/lib/identity/t2.ts` (PR #85) מאחורי `FEATURE_T2_KYC`, ויוצא ממנו רק `pass/fail` + `HMAC(docNumber)`.
1. **Didit (ראשון):** `t2-didit.ts`. `POST /v3/session/` עם workflow שכולל ID, passive liveness ו-face match בלבד. AML ו-NFC לא נכללים כי הם בתשלום. ה-webhook נבדק עם HMAC. מה-decision נשמרים רק הסטטוס ומספר המסמך, שעובר HMAC מיד. אחרי ההחלטה קוראים ל-Delete Session ומגדירים retention מינימלי. משתני סביבה: `DIDIT_API_KEY`, `DIDIT_WEBHOOK_SECRET`, `DIDIT_WORKFLOW_ID`. בודקים ב-sandbox, שלא נספר במכסה.
2. **Persona (גיבוי):** `t2-persona.ts`. Inquiry template של Government ID + Selfie, webhook חתום, וקריאה ל-Redact Inquiry אחרי ההחלטה. התנאי: התקבלות ל-Startup Program, שדורשת חברה רשומה.
3. **zkPassport / Self (מסלול T3, לדרכון בלבד):** `t3-zkpassport.ts`. מאמתים את ההוכחה בצד השרת (מעל 18, אזרחות IL, nullifier ייחודי לכל scope של GeoPoll). מתאים לדרכון ביומטרי, אבל לא לת"ז, ולכן צריך fallback.

### 5.2 מה נוה צריך לעשות בעצמו (הרשמה ופעולות של בעל החשבון)
- Didit: הרשמה עם מייל עבודה. ייתכן שיידרש KYB, לא אומת.
- Persona: חשבון ובקשה ל-Startup Program, שכוללת פרטי חברה רשומה.
- Veriff: אם רוצים לנסות, נדרש אימות זהות של בעל החשבון תוך 15 יום.
- AU10TIX: טופס יצירת קשר.
- Self / zkPassport: לא צריך הרשמה. מספיק SDK ובדיקה עם דרכון אמיתי במכשיר.

## 6. T1 במקביל (גוגל + ת"ז שמורה כ-HMAC)
- נשאר מאחורי flag עד שעורך הדין יאשר (K1–K5, A-סעיפים).
- ספרת ביקורת של ת"ז נבדקת בלקוח ובשרת. בשרת נשמר רק `HMAC(pepper_T1, id)`, וה-pepper ב-KMS/env (`T1_ID_PEPPER`) לא יוצא מתחום A.
- T1 לא מוכיח בעלות על הת"ז, ולכן הוא חלש. המשקל שלו בתוצאות מוצג בנפרד מ-T2, וכשמשתמש עולה ל-T2, אותו HMAC של מספר המסמך מקשר את החשבון ומונע כפילות.
- הגבלת קצב לניסיונות הזנה, כדי למנוע מניית ת"ז.
- מפתח החתימה של T1 נפרד מזה של T2, ושדרוג נכנס לתוקף מה-epoch הבא (ADR-0019).
