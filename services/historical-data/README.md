# historical-data

שירות קליטת נתונים היסטוריים, לפי ADR-0021 (מוצע). בשלב הזה יש בו רק מייבא אחד, לתוצאות הבחירות לכנסת 21–25 מ-data.gov.il.

## הרצה

```bash
cd services/historical-data
python3 -m unittest discover -s tests -t .              # בדיקות, בלי רשת
python3 -m geopoll_hist.cli import-knesset               # הכול (~124MB ל-data/, לא ב-git)
python3 -m geopoll_hist.cli import-knesset --knesset 25 --level locality
```

## פלט

- `data/knesset{N}_{level}.csv`: פורמט ארוך, אחיד, ב-UTF-8. התיקייה ב-`.gitignore`.
- `manifests/knesset.json`: ה-sha256, הגרסה, ספירות השורות, המקור והרישיון. **הקובץ הזה נכנס ל-git.**
- אחרי הרצה, אם ה-sha256 שונה מזה שבמניפסט, צריך לבדוק למה לפני שמעדכנים.

## סכמה (פורמט ארוך)

| עמודה | תיאור |
| --- | --- |
| knesset | מספר הכנסת |
| level | `locality` או `ballot` |
| locality_code / locality_name | סמל הלמ"ס ושם היישוב |
| ballot | מספר הקלפי (טקסט, למשל `3.1`). ריק ברמת יישוב |
| eligible / voters / invalid / valid | בזב, מצביעים, פסולים, כשרים |
| list_letter / votes | אות הרשימה ומספר הקולות שלה |

## הערות

- קישורי ההורדה הישירים של ה-CSV מחזירים 403 ללקוח שהוא לא דפדפן. לכן המייבא משתמש ב-CKAN `datastore_search`, עם עימוד ובדיקת ספירה.
- **רישיון:** `Other (Open)`. לא ידוע עד שעורך דין יבדוק (שאלה D1).
