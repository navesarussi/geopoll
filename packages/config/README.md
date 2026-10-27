# packages/config

שכבת התצורה הגלובלית ([ADR-0022](../../docs/decisions/0022-global-configuration-layer.md), מוצע): מקור אמת יחיד לכללי מדינה (גילאים, ספי k, טווחים, קצב אצוות ופרסום, חלון איסור 16ה), סוגי משאלים, שפות, feature flags וכתובות שירותים.

- `src/base.ts` – ברירות מחדל גלובליות. `src/il.ts` – דריסות לישראל.
- `loadConfig(country, env)` – base ← מדינה ← env (רק כפתורי פריסה). מאומת ב-`validate()`; תצורה לא תקינה זורקת שגיאה.
- `isBlackout(jurisdiction, kind, now)` – חלון 16ה(ח).
- ללא תלויות runtime, כדי שכל app יוכל לייבא את קובצי ה-TS ישירות (`@geopoll/config`). הבדיקות רצות ב-`apps/web/tests/config.test.ts`.
- שינוי ערך שמקורו ב-ADR מאושר (ספים, טווחים, אצוות, חלון איסור, גילאים) דורש ADR מאושר ע"י נוה (AGENTS.md §2.3).
