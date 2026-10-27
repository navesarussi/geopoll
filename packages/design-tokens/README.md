# packages/design-tokens

טוקני עיצוב (צבעים, רדיוסים, ריווח, טיפוגרפיה) – מקור אמת יחיד ([ADR-0022](../../docs/decisions/0022-global-configuration-layer.md)). `apps/web` מזריק אותם כמשתני CSS (`--gp-*`) ב-layout, וכל ה-CSS קורא מהם. שינוי ערכת נושא = שינוי קובץ אחד.
