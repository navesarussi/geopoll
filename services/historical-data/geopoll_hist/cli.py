"""CLI: python -m geopoll_hist.cli import-knesset [--knesset 25] [--level locality] [--out DIR]"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import pathlib
import sys

from . import knesset

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    k = sub.add_parser("import-knesset")
    k.add_argument("--knesset", type=int, action="append")
    k.add_argument("--level", choices=["locality", "ballot"], action="append")
    k.add_argument("--out", default=str(ROOT / "data"))
    k.add_argument("--manifest", default=str(ROOT / "manifests" / "knesset.json"))
    a = ap.parse_args(argv)

    reg = json.loads((ROOT / "sources" / "registry.json").read_text())
    src = next(s for s in reg["sources"] if s["id"] == "cec-knesset-results")
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    mpath = pathlib.Path(a.manifest)
    manifest = json.loads(mpath.read_text()) if mpath.exists() else {"source": src["id"], "entries": {}}

    for r in src["resources"]:
        if a.knesset and r["knesset"] not in a.knesset:
            continue
        if a.level and r["level"] not in a.level:
            continue
        recs = knesset.fetch_records(r["resource_id"])
        rows, v = knesset.normalize(recs, r["knesset"], r["level"])
        data = knesset.to_csv(rows)
        name = f"knesset{r['knesset']}_{r['level']}.csv"
        (out / name).write_bytes(data)
        digest = knesset.sha256(data)
        key = f"{r['knesset']}/{r['level']}"
        prev = manifest["entries"].get(key)
        version = (prev["version"] + (prev["sha256"] != digest)) if prev else 1
        manifest["entries"][key] = {
            "file": name,
            "resource_id": r["resource_id"],
            "source_records": len(recs),
            "normalized_rows": v.rows,
            "sha256": digest,
            "version": version,
            "fetched_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "license_declared": src["license_declared"],
            "license_status": src["license_status"],
            "validation_warnings": len(v.warnings),
        }
        print(f"{key}: {len(recs)} records -> {v.rows} rows, sha256={digest[:12]}, warnings={len(v.warnings)}",
              file=sys.stderr)
    mpath.parent.mkdir(parents=True, exist_ok=True)
    mpath.write_text(json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
