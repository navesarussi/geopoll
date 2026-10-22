# מבנה ה-monorepo (מוצע)

[← חזרה לאינדקס](../../README.md)

**סטטוס:** לפי [ADR-0016](../decisions/0016-proposed-tech-stack.md) (התקבל 2026-10-22). כרגע יש רק תיקיות עם README.

```text
apps/        mobile, web
services/    identity, issuer   ← תחום אמון A
             voting, results    ← תחום אמון B
             content, moderation← תחום C
packages/    crypto, shared-types, config
infra/       IaC (חשבון נפרד לכל תחום)
tools/       כלי פיתוח
docs/        מקור האמת
scripts/     סקריפטים (למשל create-issues)
```

## כללי תלות (ייאכפו ב-CI כשיהיה קוד)
- `services/identity|issuer` **לא** מייבאים מ-`services/voting|results` ולהפך. רק `packages/crypto` ו-`packages/shared-types` משותפים.
- `packages/shared-types` לא יכיל טיפוס שמשלב זהות והצבעה.
- כל שינוי ב-`services/identity`, `services/issuer`, `services/voting`, `packages/crypto` מחייב סקירת אבטחה (CODEOWNERS + label `security-review`).
