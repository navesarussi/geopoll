"""Importer for Knesset election results (CEC via data.gov.il CKAN datastore).

Raw records are fetched through the public datastore API (the direct CSV
download URLs return 403 to non-browser clients). Output is a normalized
long-format CSV per resource plus a manifest entry with sha256 + provenance.
Raw/normalized data stay out of git (see .gitignore); only manifests are committed.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Callable, Iterable

API = "https://data.gov.il/api/3/action/datastore_search"
PAGE = 5000

# Non-party columns that appear in CEC files across Knessets 21-25.
META = {
    "_id": None,
    "סמל ועדה": "committee_code",
    "ברזל": "barzel",
    "שם ישוב": "locality_name",
    "סמל ישוב": "locality_code",
    "קלפי": "ballot",
    "מספר קלפי": "ballot",  # Knesset 21 ballot file
    "ריכוז": "concentration",
    "שופט": "judge",
    "בזב": "eligible",
    "מצביעים": "voters",
    "פסולים": "invalid",
    "כשרים": "valid",
}
TOTALS = ("eligible", "voters", "invalid", "valid")
OUT_FIELDS = ["knesset", "level", "locality_code", "locality_name", "ballot",
              "eligible", "voters", "invalid", "valid", "list_letter", "votes"]

Fetcher = Callable[[str], dict]


def http_fetch(url: str, retries: int = 3) -> dict:
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "geopoll-hist/0.1"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001 - retried and re-raised
            last = e
            time.sleep(2 ** i)
    raise RuntimeError(f"fetch failed: {url}: {last}")


def fetch_records(resource_id: str, fetch: Fetcher = http_fetch) -> list[dict]:
    out: list[dict] = []
    offset = 0
    while True:
        q = urllib.parse.urlencode({"resource_id": resource_id, "limit": PAGE, "offset": offset})
        res = fetch(f"{API}?{q}")
        if not res.get("success"):
            raise RuntimeError(f"API error for {resource_id}")
        recs = res["result"]["records"]
        out.extend(recs)
        total = res["result"].get("total", len(out))
        offset += len(recs)
        if not recs or offset >= total:
            break
    if len(out) != total:
        raise ValueError(f"row count mismatch {len(out)} != {total}")
    return out


@dataclass
class Validation:
    rows: int
    warnings: list[str]


def _num(v) -> int:
    if v in (None, ""):
        return 0
    f = float(v)
    if f < 0:
        raise ValueError(f"negative count: {v}")
    return int(round(f))


def normalize(records: Iterable[dict], knesset: int, level: str) -> tuple[list[dict], Validation]:
    rows: list[dict] = []
    warnings: list[str] = []
    for rec in records:
        base = {"knesset": knesset, "level": level, "locality_code": "", "locality_name": "", "ballot": ""}
        for k in TOTALS:
            base[k] = 0
        parties: dict[str, int] = {}
        for k, v in rec.items():
            if k in META:
                tgt = META[k]
                if tgt in TOTALS:
                    base[tgt] = _num(v)
                elif tgt in ("locality_code", "locality_name"):
                    base[tgt] = str(v).strip() if tgt == "locality_name" else str(_num(v))
                elif tgt == "ballot":
                    base["ballot"] = str(v)
            else:
                parties[k.strip()] = _num(v)
        s = sum(parties.values())
        if s != base["valid"]:
            warnings.append(f"{level} loc={base['locality_code']} ballot={base['ballot']}: sum(lists)={s} != valid={base['valid']}")
        if base["voters"] > base["eligible"] and base["locality_code"] not in ("", "0", "9999", "99999"):
            # Assumption (unverified): 9999/99999 = double-envelope ballots (no fixed eligibility). Others flagged, not dropped.
            warnings.append(f"{level} loc={base['locality_code']}: voters>eligible")
        for letter, votes in sorted(parties.items()):
            rows.append({**base, "list_letter": letter, "votes": votes})
    return rows, Validation(rows=len(rows), warnings=warnings)


def to_csv(rows: list[dict]) -> bytes:
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=OUT_FIELDS, lineterminator="\n")
    w.writeheader()
    w.writerows(rows)
    return buf.getvalue().encode("utf-8")


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()
