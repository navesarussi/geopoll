import unittest

from geopoll_hist import knesset


def fake_api(pages):
    calls = iter(pages)

    def fetch(url):
        return next(calls)
    return fetch


class TestFetch(unittest.TestCase):
    def test_paginates_and_checks_total(self):
        p1 = {"success": True, "result": {"total": 3, "records": [{"a": 1}, {"a": 2}]}}
        p2 = {"success": True, "result": {"total": 3, "records": [{"a": 3}]}}
        self.assertEqual(len(knesset.fetch_records("x", fake_api([p1, p2]))), 3)

    def test_api_error(self):
        with self.assertRaises(RuntimeError):
            knesset.fetch_records("x", fake_api([{"success": False}]))


class TestNormalize(unittest.TestCase):
    rec = {"_id": 1, "שם ישוב": " שחר ", "סמל ישוב": 7, "בזב": 516, "מצביעים": 371,
           "פסולים": 0, "כשרים": 371, "מחל": 141, "פה": 99, "שס": 131}

    def test_long_format(self):
        rows, v = knesset.normalize([self.rec], 21, "locality")
        self.assertEqual(len(rows), 3)
        self.assertEqual({r["list_letter"] for r in rows}, {"מחל", "פה", "שס"})
        self.assertTrue(all(r["locality_code"] == "7" and r["locality_name"] == "שחר" for r in rows))
        self.assertEqual(v.warnings, [])

    def test_sum_mismatch_warns(self):
        bad = dict(self.rec, כשרים=400)
        _, v = knesset.normalize([bad], 21, "locality")
        self.assertEqual(len(v.warnings), 1)

    def test_ballot_decimal_kept(self):
        rec = dict(self.rec, קלפי=3.1)
        rows, _ = knesset.normalize([rec], 25, "ballot")
        self.assertEqual(rows[0]["ballot"], "3.1")

    def test_k21_ballot_column(self):
        rec = dict(self.rec, **{"מספר קלפי": 1})
        rows, v = knesset.normalize([rec], 21, "ballot")
        self.assertEqual(rows[0]["ballot"], "1")
        self.assertNotIn("מספר קלפי", {r["list_letter"] for r in rows})

    def test_negative_rejected(self):
        with self.assertRaises(ValueError):
            knesset.normalize([dict(self.rec, מחל=-1)], 21, "locality")

    def test_csv_deterministic(self):
        rows, _ = knesset.normalize([self.rec], 21, "locality")
        self.assertEqual(knesset.sha256(knesset.to_csv(rows)), knesset.sha256(knesset.to_csv(rows)))


if __name__ == "__main__":
    unittest.main()
