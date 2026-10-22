# CI/CD

[← חזרה לאינדקס](../../README.md)

## פעיל עכשיו
| workflow | מה בודק |
|---|---|
| [docs.yml](../../.github/workflows/docs.yml) | markdownlint (כללים מקלים), בדיקת קישורים פנימיים (lychee offline), תקינות YAML |

## תבניות לעתיד (מושבתות)
ב-[.github/workflow-templates/](../../.github/workflow-templates/) – **לא רצות** עד שיועברו ל-`.github/workflows/` ב-PR שמאושר:
| תבנית | תוכן |
|---|---|
| `ci-code.yml.template` | build + test + lint לכל חבילה ששונתה (Turborepo/Cargo) |
| `security.yml.template` | CodeQL, dependency review, Semgrep (SAST), SBOM (Syft), gitleaks |
| `boundary-check.yml.template` | אכיפת כללי התלות בין תחומי אמון |

## שערים (gates) מוצעים לכל PR עם קוד
1. כל הבדיקות עוברות; כיסוי לא יורד (סף – **הנחה**, TBD).
2. CodeQL + Semgrep בלי ממצא High.
3. Dependency review: אין רישיון אסור (רשימה – **דורש עו"ד**) ואין CVE קריטי.
4. Secret scanning + push protection (הגדרת ריפו – ראו [branch-protection](branch-protection.md)).
5. שינוי בתחומי A/B/crypto → אישור של CODEOWNER + label `security-review`.
6. performance budget לפי ADR-0015 (**הנחה**).

## CD (עתידי)
סביבות dev → staging → prod; prod רק מ-main עם אישור ידני; פריסה נפרדת לכל תחום אמון; חתימת artifacts (Sigstore – **הנחה**).
