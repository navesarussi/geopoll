# CI/CD

[← חזרה לאינדקס](../../README.md)

## פעיל עכשיו
| workflow | מה בודק |
|---|---|
| [docs.yml](../../.github/workflows/docs.yml) | markdownlint (כללים מקלים), בדיקת קישורים פנימיים (lychee offline), תקינות YAML, כיסוי STRIDE ב-[threat-model.md](../architecture/threat-model.md) |
| [ci.yml](../../.github/workflows/ci.yml) | job מאגד **`CI gate`** (הוא ה-check היחיד שצריך להיות חובה): lint קל (`scripts/lint.mjs`; ESLint עוד לא אומץ), typecheck, vitest + coverage ratchet (`scripts/ci/coverage-baseline.json`), אינטגרציה מול Postgres 17 ב-docker (pull עם retries), gitleaks, build + תקציב גודל bundle (`scripts/ci/bundle-budget.json`), Lighthouse (מייעץ בלבד) |
| [dependabot.yml](../../.github/dependabot.yml) | עדכוני npm ו-Actions שבועיים, מקובצים |

**Vercel:** `apps/web/vercel.json` מפעיל את `scripts/vercel-should-build.sh`, שמדלג על בנייה כשאין שינוי ב-`apps/web` / `packages/*` וכשהענף אינו `main` (חוסך מכסת Hobby). אפשר להפעיל previews עם `GEOPOLL_PREVIEW_BUILDS=1`.

**Branch protection:** ריפו פרטי בחשבון אישי. נוה צריך להפעיל אותו ב-Settings (check חובה: `CI gate`) או ליצור `ADMIN_PAT`.

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
