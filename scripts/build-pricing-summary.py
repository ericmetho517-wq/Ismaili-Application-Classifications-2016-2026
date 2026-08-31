from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: build-pricing-summary.py INPUT_JSON OUTPUT_JSON")
    source = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    grouped = defaultdict(lambda: {"count": 0, "area_m2": 0.0, "price_2016": 0.0, "price_2026": 0.0})
    for row in source.get("rows", []):
        use = str(row.get("use") or "غير محدد").strip()
        land_use_code = int(row.get("land_use_code")) if row.get("land_use_code") is not None else None
        area = float(row.get("area_m2") or 0)
        price_2016 = float(row.get("price_2016") or 0)
        price_2026 = float(row.get("price_2026") or 0)
        if area <= 0 or price_2016 <= 0 or price_2026 <= 0:
            continue
        item = grouped[(use, land_use_code)]
        item["count"] += 1
        item["area_m2"] += area
        item["price_2016"] += price_2016
        item["price_2026"] += price_2026

    output = {
        "total_features": source.get("total_features", 0),
        "groups": [{"use": use, "land_use_code": land_use_code, **values} for (use, land_use_code), values in grouped.items()],
    }
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(output['groups'])} pricing groups")


if __name__ == "__main__":
    main()
