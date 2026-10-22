# ארה"ב – מחקר שוק ומשפט (טיוטה)

> מסמך מחקר, לא ייעוץ משפטי. נכתב ב-2026-10-22. מסמך נגזר מהאפיון הראשי ([README](../../README.md), [צירים](../axes/)). הוא לא משנה עקרונות. סימונים: **הנחה**, **דורש אימות**, ומקור לכל טענה מאומתת.

## א. פרסום סקרים ותקופת בחירות
- אין בארה"ב איסור פדרלי על פרסום סקרים לפני בחירות. הגנת התיקון הראשון לחוקה הופכת איסור כזה לקשה מאוד. **דורש אימות** לגבי פסיקה ספציפית (למשל ביטול חוקים מדינתיים שהגבילו exit polls ליד קלפיות, כמו *Daily Herald v. Munro*, 1988).
- ה-FEC מסדיר מימון בחירות ופרסום פוליטי בתשלום (disclaimers), לא סקרים אורגניים של משתמשים. רלוונטי אם GeoPoll תמכור שירותים למפלגות/קמפיינים: תשלום מקמפיין עשוי להיחשב הוצאה/תרומה בעין. **דורש אימות** מול עו"ד ([FEC](https://www.fec.gov/)).
- מדינות שונות מגבילות פעילות בקרבת קלפיות. לא רלוונטי ישירות לפלטפורמה מקוונת. **הנחה**.

## ב. פרטיות של דעות פוליטיות ומכירת מידע
- אין חוק פרטיות פדרלי כללי. יש חוקים מדינתיים מקיפים (קליפורניה CCPA/CPRA ועוד כ-20 מדינות).
- **CPRA:** רשימת "sensitive personal information" כוללת מוצא, אמונות דתיות/פילוסופיות, חברות באיגוד, ביומטריה ועוד, אבל **לא** "דעות פוליטיות" במפורש ([Clarip](https://www.clarip.com/data-privacy/handling-sensitive-personal-information-under-the-cpra-and-the-vcdpa/), [IAPP](https://iapp.org/news/a/new-categories-new-rights-the-cpras-opt-out-provision-for-sensitive-data)). הביומטריה של ה-KYC כן נכללת.
- חלק מחוקי המדינות האחרים אולי כוללים דעות פוליטיות כמידע רגיש. **דורש אימות** מדינה-מדינה ([השוואה של Clarip](https://www.clarip.com/data-privacy/side-by-side-comparison-how-sensitive-data-is-defined-among-states/)).
- "מכירה" ב-CCPA מוגדרת רחב, וצריך מנגנון opt-out. מידע שעבר de-identification או aggregate consumer information יוצא מההגדרה, בתנאים. **דורש אימות** לגבי התנאים המדויקים. **הנחה:** מכירת תוצאות מצרפיות בלבד (סף k מינימלי) תהיה מחוץ ל"מכירה".
- ביומטריה: חוק BIPA באילינוי מחייב הסכמה בכתב ומאפשר תביעות פרטיות. סיכון גבוה לתבניות פנים לזיהוי כפילויות. **דורש אימות**.

## ג. רגולציית פלטפורמות
- **Section 230** (47 U.S.C. §230) מגן על פלטפורמה מאחריות לתוכן משתמשים ועל החלטות מודרציה בתום לב ([Cornell LII](https://www.law.cornell.edu/uscode/text/47/230)). זה תומך ישירות בחוקי הכבוד/אמת של GeoPoll.
- חוקי טקסס ופלורידה שהגבילו מודרציה: בפסק דין *Moody v. NetChoice* (2024) העליון קבע שעריכת פיד היא פעילות מוגנת והחזיר לערכאות נמוכות. **דורש אימות** לגבי המצב העדכני.

## ד. קטינים
- **COPPA** חל מתחת לגיל 13. מסלול הנוער שלנו (13–17) מחוץ לו, אבל צריך מנגנון שמונע כניסה מתחת ל-13. תיקון הכלל בתוקף מ-23.6.2025, ורוב החובות מ-22.4.2026 ([Federal Register](https://www.federalregister.gov/documents/2025/04/22/2025-05904/childrens-online-privacy-protection-rule)).
- ה-FTC הודיע בפברואר 2026 שלא יאכוף COPPA על איסוף מידע לצורך אימות גיל בלבד, בתנאי מזעור ומחיקה ([FTC](https://www.ftc.gov/news-events/news/press-releases/2026/02/ftc-issues-coppa-policy-statement-incentivize-use-age-verification-technologies-protect-children)). מתאים לעיקרון מזעור המידע שלנו.
- **App Store Accountability Acts:** חוקקו בלואיזיאנה, טקסס, יוטה וקליפורניה ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/01/little-users-big-rules-tracking-childrens-privacy-legislation)). בטקסס (SB 2420) החוק בתוקף מ-1.1.2026, נעצר בצו ושוחרר בעיכוב של בית המשפט לערעורים במאי–יוני 2026. הוא מגדיר קטגוריות 13–15 ו-16–17 ומחייב מפתחים לכבד אות גיל מחנות האפליקציות ולמחוק את המידע ([Orrick](https://onlinesafety.orrick.com/texas/)). ביוטה החובות נדחו ל-6.5.2027 (לפי אותו סיכום, **דורש אימות**).
- *Free Speech Coalition v. Paxton* (יוני 2025) אישר אימות גיל לאתרי תוכן מיני. לא חל עלינו ישירות, אבל מראה שבית המשפט מקבל אימות גיל ([Mayer Brown](https://www.mayerbrown.com/en/insights/publications/2026/01/little-users-big-rules-tracking-childrens-privacy-legislation)).

## ה. זהות דיגיטלית ו-KYC
- **Login.gov** לא זמין לחברות פרטיות. נדרשת חקיקה ([Beeck Center, 2021](https://beeckcenter.georgetown.edu/wp-content/uploads/2021/10/Login.gov-For-Private-Sector.pdf); **דורש אימות** שלא השתנה מאז).
- **mDL:** רישיונות נהיגה דיגיטליים מ-22 מדינות ופוארטו ריקו מאושרים לשימוש פדרלי ([TSA](https://www.tsa.gov/realid/realid-mobile-drivers-license-mdls)). קבלה של mDL (ISO 18013-5/7) באפליקציה פרטית אפשרית טכנית, ויכולה לתמוך בחשיפה סלקטיבית ("מעל 18", "תושב מדינה X"). **דורש אימות** לגבי תנאי השימוש של Apple/Google Wallet ל-verifiers פרטיים.
- **ID.me** ו-**CLEAR** הם ספקים פרטיים שעובדים גם עם ממשלה וגם עם ארגונים פרטיים ([VA](https://www.va.gov/resources/should-i-create-a-logingov-or-idme-account-to-sign-in-to-vagov/)). מחיר וזמינות ל-startup: **דורש אימות**.
- **אזרחות מול זכות הצבעה:** תעודה מוכיחה זהות ומדינה, לא תמיד אזרחות או רישום כבוחר. **הנחה:** בארה"ב נסמן "תושב מאומת במדינה X" ולא "בוחר".

## ו. מבני עמותה ותרומות
- **501(c)(3):** תרומות מוכרות במס, אבל אסור לחלוטין להתערב בקמפיין בעד או נגד מועמד. מותר חינוך ציבורי לא-מפלגתי ([IRS](https://www.irs.gov/charities-non-profits/charitable-organizations/the-restriction-of-political-campaign-intervention-by-section-501c3-tax-exempt-organizations)). פלטפורמה ניטרלית בלי המלצות עשויה להתאים. **דורש אימות**.
- **501(c)(4):** מותרת פעילות פוליטית מוגבלת, אבל תרומות לא מוכרות במס ([IRS](https://www.irs.gov/charities-non-profits/other-non-profits/social-welfare-organizations)).
- **מודל היברידי:** חברה (Delaware C-Corp או PBC) לצד עמותה. Public Benefit Corporation מאפשרת לעגן מטרה ציבורית. **דורש אימות**.

## ז. מתחרים ושחקני civic-tech
| שחקן | מה | רלוונטיות |
|---|---|---|
| [Pol.is](https://pol.is/) | שיחה בקנה מידה גדול, קוד פתוח | השראה לפורומים/קונצנזוס. לא מאמת זהות (**דורש אימות**) |
| Countable | אפליקציה למעקב אחרי חקיקה ונציגים | סטטוס נוכחי **דורש אימות** |
| [dvtd](https://dvtd.org/), SwingPolls | הצבעות/סקרים עם אימות | כבר ב-[ניתוח המתחרים](../competitors.md). **דורש אימות** |

**מממנים אפשריים (לא נבדקו, דורש אימות):** Knight Foundation, Democracy Fund (אמריקאית, שונה מ-UNDEF), Omidyar Network, Hewlett Foundation. כולם תורמים לרוב לעמותות ולא לחברות.

## ח. גודל שוק
לא מצאתי נתון ממקור אמין. לא מוצג גודל שוק.

## השלכות על GeoPoll
1. ארה"ב היא השוק הכי חופשי לפרסום סקרים, ויש בה הגנה (Section 230) על מודרציה.
2. הסיכונים: ביומטריה (BIPA), חוקי אימות גיל של חנויות אפליקציות, ומעמד מס אם נקבל כסף מקמפיינים.
