from __future__ import annotations

import json
import math
import shutil
import sys
from datetime import datetime
from pathlib import Path

import geopandas as gpd
from shapely import force_2d, make_valid


CORE_LAYERS = [
    "LandCover",
    "Agricultural_Changes",
    "Axis_Road_Sector",
    "Industrial_Changes",
    "Land_Cover2016",
    "Land_Cover2026",
    "Land_Cover_Area_Compare",
    "Study_Area_Sector",
    "Urban_Changes",
    "Water_Changes",
]

COL = {
    "area_km2": "\u0645\u0633\u0627\u062d\u0629_\u0643\u06452",
    "area_km2_alt": "\u0627\u0644\u0645\u0633\u0627\u062d\u0629_\u0643\u06452",
    "change_area_km2": "\u0645\u0633\u0627\u062d\u0629_\u0627\u0644\u062a\u063a\u064a\u0631_\u0643\u06452",
    "study_area_km2": "\u0645\u0633\u0627\u062d\u0629_\u0627\u0644\u0645\u0646\u0637\u0642\u0629_\u0643\u06452",
    "axis_length_km": "\u0637\u0648\u0644_\u0627\u0644\u0645\u062d\u0648\u0631_\u0643\u0645",
    "use": "\u0627\u0633\u062a\u062e\u062f\u0627\u0645_\u0627\u0644\u0623\u0631\u0636",
    "desc": "\u0648\u0635\u0641_\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645",
    "change": "\u062d\u0627\u0644\u0629_\u0627\u0644\u062a\u063a\u064a\u0631",
    "urban_type": "\u0646\u0645\u0637_\u0627\u0644\u0639\u0645\u0631\u0627\u0646",
    "crop": "\u0623\u0646\u0648\u0627\u0639_\u0627\u0644\u0645\u062d\u0627\u0635\u064a\u0644_\u0627\u0644\u0645\u0632\u0631\u0648\u0639\u0629",
    "owner": "\u0646\u0648\u0639_\u0645\u0644\u0643\u064a\u0629_\u0627\u0644\u0623\u0631\u0636",
    "water_name": "\u0627\u0633\u0645_\u0627\u0644\u0645\u0633\u0637\u062d",
}

UNSPECIFIED = "\u063a\u064a\u0631 \u0645\u062d\u062f\u062f"

USE_CODE_MAP = {
    "0": "\u0632\u0631\u0627\u0639\u064a",
    "1": "\u0635\u0646\u0627\u0639\u064a",
    "2": "\u0627\u0631\u0636 \u0641\u0636\u0627\u0621",
    "3": "\u062d\u0636\u0631\u064a / \u0639\u0645\u0631\u0627\u0646\u064a",
    "4": "\u0645\u0646\u0637\u0642\u0629 \u0639\u0633\u0643\u0631\u064a\u0629",
    "5": "\u062e\u062f\u0645\u0627\u062a",
    "6": "\u062e\u062f\u0645\u0627\u062a",
    "7": "\u062e\u062f\u0645\u0627\u062a",
    "8": "\u0645\u064a\u0627\u0647",
    "10": "\u0637\u0631\u0642",
    "11": "\u062e\u062f\u0645\u0627\u062a",
    "12": "\u062e\u062f\u0645\u0627\u062a",
    "13": "\u062e\u062f\u0645\u0627\u062a",
    "14": "\u062e\u062f\u0645\u0627\u062a",
    "15": "\u062e\u0636\u0631\u0627\u0621 / \u063a\u0627\u0628\u0627\u062a",
    "111": "\u062e\u062f\u0645\u0627\u062a",
}

PRICE_2016 = "\u0633\u0639\u0631_\u0627\u0644\u0623\u0631\u0636_2016"
PRICE_2026 = "\u0633\u0639\u0631_\u0627\u0644\u0623\u0631\u0636_2026"

def clean_value(value):
    if value is None:
        return UNSPECIFIED
    if hasattr(value, "item"):
        value = value.item()
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return UNSPECIFIED
    return text


def finite_number(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return number if math.isfinite(number) else 0.0


def numeric_series(gdf, candidates):
    for col in candidates:
        if col in gdf.columns:
            return gdf[col].fillna(0).astype(float)
    for col in ("SHAPE_Area", "Shape_Area"):
        if col in gdf.columns:
            return gdf[col].fillna(0).astype(float) / 1_000_000
    return gdf.geometry.area / 1_000_000


def area_sum(gdf):
    return numeric_series(
        gdf,
        [COL["area_km2"], COL["area_km2_alt"], COL["change_area_km2"], COL["study_area_km2"]],
    )


def round4(value):
    return round(float(value), 4)


def summary_items(gdf, key_func):
    areas = area_sum(gdf)
    totals = {}
    for idx, row in gdf.iterrows():
        name = clean_value(key_func(row))
        item = totals.setdefault(name, {"area": 0.0, "count": 0})
        item["area"] += float(areas.loc[idx])
        item["count"] += 1
    return [
        {"name": name, "area_km2": round4(v["area"]), "count": v["count"]}
        for name, v in sorted(totals.items(), key=lambda item: item[1]["area"], reverse=True)
    ]


def land_use_name(row):
    raw = clean_value(row.get(COL["use"]))
    return USE_CODE_MAP.get(raw, clean_value(row.get(COL["desc"])))


def read_layer(gdb_path, layer):
    gdf = gpd.read_file(gdb_path, layer=layer)
    source_crs = str(gdf.crs) if gdf.crs is not None else None
    if gdf.crs is not None and str(gdf.crs).upper() != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")
    gdf.geometry = gdf.geometry.apply(lambda geom: force_2d(geom) if geom is not None else geom)
    gdf.attrs["source_crs"] = source_crs
    return gdf


def discover_layers(gdb_path):
    """Return every spatial layer, keeping the dashboard's core layers first."""
    available = gpd.list_layers(gdb_path)["name"].tolist()
    missing = [layer for layer in CORE_LAYERS if layer not in available]
    if missing:
        raise ValueError(f"Required GDB layers are missing: {', '.join(missing)}")
    return CORE_LAYERS + [layer for layer in available if layer not in CORE_LAYERS]


def export_layers(gdb_path, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    loaded = {}
    for layer in discover_layers(gdb_path):
        print(f"Reading {layer}...")
        gdf = read_layer(gdb_path, layer)
        loaded[layer] = gdf
        target = out_dir / f"{layer}.geojson"
        gdf.to_file(target, driver="GeoJSON", encoding="UTF-8")
        print(f"  wrote {target} ({len(gdf)} features)")
    return loaded


def export_web_optimized_data(layers, out_dir):
    """Build compact geometry and pricing payloads used by the browser."""
    map_dir = out_dir / "map"
    map_dir.mkdir(parents=True, exist_ok=True)
    for layer, gdf in layers.items():
        # Keep every source attribute in the browser payload. Geometry alone is
        # simplified for rendering; the full-resolution export remains alongside it.
        selected = [field for field in gdf.columns if field != gdf.geometry.name]
        map_gdf = gdf[selected + [gdf.geometry.name]].copy()
        if layer not in {"Study_Area_Sector", "Axis_Road_Sector"}:
            map_gdf.geometry = map_gdf.geometry.simplify(0.00006, preserve_topology=True)
        target = map_dir / f"{layer}.geojson"
        map_gdf.to_file(
            target,
            driver="GeoJSON",
            encoding="UTF-8",
            layer_options={"COORDINATE_PRECISION": "6"},
        )
        print(f"  optimized {target} ({target.stat().st_size / 1_000_000:.1f} MB)")

    export_pricing_data(layers["Land_Cover2026"], out_dir)


def export_pricing_data(land, out_dir):
    pricing_rows = []
    for index, row in land.iterrows():
        old_price = finite_number(row.get(PRICE_2016))
        new_price = finite_number(row.get(PRICE_2026))
        area = finite_number(row.get("SHAPE_Area")) or finite_number(row.get("Shape_Area"))
        if old_price <= 0 or new_price <= 0 or area <= 0:
            continue
        pricing_rows.append(
            {
                "id": clean_value(row.get("GlobalID")) if row.get("GlobalID") else str(index + 1),
                "use": clean_value(row.get(COL["desc"])),
                "land_use_code": int(row.get(COL["use"])),
                "area_m2": area,
                "price_2016": old_price,
                "price_2026": new_price,
            }
        )
    pricing = {"total_features": int(len(land)), "rows": pricing_rows}
    pricing_target = out_dir / "pricing.json"
    pricing_target.write_text(json.dumps(pricing, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  optimized {pricing_target} ({pricing_target.stat().st_size / 1_000_000:.1f} MB)")


def export_layer_manifest(gdb_path, layers, out_dir):
    """Preserve source schemas, including schemas for layers with zero features."""
    geometry_types = dict(gpd.list_layers(gdb_path)[["name", "geometry_type"]].itertuples(index=False, name=None))
    manifest = {
        "layers": [
            {
                "name": name,
                "geometry_type": geometry_types.get(name),
                "source_crs": gdf.attrs.get("source_crs"),
                "web_crs": str(gdf.crs) if gdf.crs is not None else None,
                "feature_count": int(len(gdf)),
                "fields": [
                    {"name": field, "type": str(gdf[field].dtype)}
                    for field in gdf.columns
                    if field != gdf.geometry.name
                ],
            }
            for name, gdf in layers.items()
        ]
    }
    target = out_dir / "layers-manifest.json"
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Manifest wrote {target}")


def clear_exported_data(out_dir):
    """Remove previously exported app data so the GDB import is a full replacement."""
    if not out_dir.exists():
        return
    for target in out_dir.glob("*.geojson"):
        target.unlink()
    for name in ("summary.json", "pricing.json", "layers-manifest.json"):
        target = out_dir / name
        if target.exists():
            target.unlink()
    map_dir = out_dir / "map"
    if map_dir.exists():
        shutil.rmtree(map_dir)


def load_study_boundary_fallback(out_dir):
    """Keep the last usable study boundary when a newer GDB ships an empty layer."""
    target = out_dir / "Study_Area_Sector.geojson"
    if not target.exists():
        return None
    boundary = gpd.read_file(target)
    if boundary.empty:
        return None
    if boundary.crs is not None and str(boundary.crs).upper() != "EPSG:4326":
        boundary = boundary.to_crs("EPSG:4326")
    boundary.geometry = boundary.geometry.apply(
        lambda geom: make_valid(force_2d(geom)) if geom is not None else geom
    )
    boundary.attrs["source_crs"] = "preserved-boundary"
    return boundary


def build_summary(layers):
    land2016 = layers["Land_Cover2016"]
    land2026 = layers["Land_Cover2026"]
    urban = layers["Urban_Changes"]
    agri = layers["Agricultural_Changes"]
    industrial = layers["Industrial_Changes"]
    water = layers["Water_Changes"]
    study = layers["Study_Area_Sector"]
    axis = layers["Axis_Road_Sector"]

    axis_length = 0.0
    if COL["axis_length_km"] in axis.columns:
        axis_length = float(axis[COL["axis_length_km"]].fillna(0).astype(float).sum())
        if axis_length > 10_000:
            axis_length = axis_length / 1_000
    else:
        axis_metric = axis.to_crs("EPSG:3857") if axis.crs is not None else axis
        axis_length = float(axis_metric.geometry.length.sum() / 1_000)

    data = {
        "land_cover_2016": summary_items(land2016, land_use_name),
        "land_cover_2026": summary_items(land2026, land_use_name),
        "urban_by_type": summary_items(urban, lambda row: row.get(COL["urban_type"]) or row.get(COL["desc"])),
        "agricultural_by_crop": summary_items(agri, lambda row: row.get(COL["crop"])),
        "agricultural_by_ownership": summary_items(agri, lambda row: row.get(COL["owner"])),
        "industrial_by_desc": summary_items(industrial, lambda row: row.get(COL["desc"])),
        "water_by_name": summary_items(water, lambda row: row.get(COL["water_name"])),
        "change_status_2026": summary_items(land2026, lambda row: row.get(COL["change"])),
        "totals": {
            "study_area_km2": round(float(area_sum(study).sum()), 1),
            "axis_length_km": round4(axis_length),
            "urban_count": int(len(urban)),
            "agri_count": int(len(agri)),
            "industrial_count": int(len(industrial)),
            "water_count": int(len(water)),
            "urban_area_km2": round4(area_sum(urban).sum()),
            "agri_area_km2": round4(area_sum(agri).sum()),
            "industrial_area_km2": round4(area_sum(industrial).sum()),
            "water_area_km2": round4(area_sum(water).sum()),
        },
    }
    return data


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python scripts/update_data_from_gdb.py <Phase_3.gdb> [public/data]")

    gdb_path = Path(sys.argv[1])
    out_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("public/data")
    if not gdb_path.exists():
        raise SystemExit(f"GDB not found: {gdb_path}")

    study_boundary_fallback = load_study_boundary_fallback(out_dir)
    if out_dir.exists():
        backup = Path(".workspace") / f"data-backup-{datetime.now():%Y%m%d-%H%M%S}"
        shutil.copytree(out_dir, backup)
        print(f"Backup: {backup}")

    clear_exported_data(out_dir)
    layers = export_layers(gdb_path, out_dir)
    if layers["Study_Area_Sector"].empty and study_boundary_fallback is not None:
        layers["Study_Area_Sector"] = study_boundary_fallback
        study_boundary_fallback.to_file(
            out_dir / "Study_Area_Sector.geojson", driver="GeoJSON", encoding="UTF-8"
        )
        print("  restored the preserved Study_Area_Sector boundary (source layer is empty)")
    export_web_optimized_data(layers, out_dir)
    export_layer_manifest(gdb_path, layers, out_dir)
    summary = build_summary(layers)
    (out_dir / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Summary wrote {out_dir / 'summary.json'}")


if __name__ == "__main__":
    main()
