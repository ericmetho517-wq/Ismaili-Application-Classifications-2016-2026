from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
OVERPASS_QUERY = """[out:json][timeout:90];
way["highway"]["name"~"Ring Road|Regional Ring|Middle Ring|الدائري|الأوسط|الإقليمي",i](29.5,30.0,30.9,32.5);
out tags geom;
"""

ROADS = {
    "Road_CairoRing": {
        "source_name": "الطريق الدائري",
        "name_ar": "الطريق الدائري",
        "name_en": "Cairo Ring Road",
    },
    "Road_MiddleRing": {
        "source_name": "الطريق الدائري الأوسطى",
        "name_ar": "الطريق الدائري الأوسطي",
        "name_en": "Middle Ring Road",
    },
    "Road_RegionalRing": {
        "source_name": "الطريق الدائري الإقليمي",
        "name_ar": "الطريق الدائري الإقليمي",
        "name_en": "Regional Ring Road",
    },
}


def load_overpass(source: Path | None) -> dict:
    if source:
        return json.loads(source.read_text(encoding="utf-8"))

    body = urllib.parse.urlencode({"data": OVERPASS_QUERY}).encode("utf-8")
    request = urllib.request.Request(
        OVERPASS_URL,
        data=body,
        headers={"User-Agent": "IsmailiaGeoDashboard/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read())


Point = list[float]
Ring = list[Point]
Polygon = list[Ring]


def load_study_polygons(source: Path) -> list[Polygon]:
    data = json.loads(source.read_text(encoding="utf-8-sig"))
    polygons: list[Polygon] = []
    for feature in data.get("features", []):
        geometry = feature.get("geometry") or {}
        if geometry.get("type") == "Polygon":
            polygons.append(geometry.get("coordinates", []))
        elif geometry.get("type") == "MultiPolygon":
            polygons.extend(geometry.get("coordinates", []))
    return polygons


def point_in_ring(point: Point, ring: Ring) -> bool:
    x, y = point
    inside = False
    previous = ring[-1]
    for current in ring:
        x1, y1 = previous
        x2, y2 = current
        if (y1 > y) != (y2 > y):
            crossing_x = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < crossing_x:
                inside = not inside
        previous = current
    return inside


def point_in_study_area(point: Point, polygons: list[Polygon]) -> bool:
    return any(
        polygon
        and point_in_ring(point, polygon[0])
        and not any(point_in_ring(point, hole) for hole in polygon[1:])
        for polygon in polygons
    )


def segment_intersection_t(a: Point, b: Point, c: Point, d: Point) -> float | None:
    ax, ay = a
    bx, by = b
    cx, cy = c
    dx, dy = d
    rx, ry = bx - ax, by - ay
    sx, sy = dx - cx, dy - cy
    denominator = rx * sy - ry * sx
    if abs(denominator) < 1e-14:
        return None
    qx, qy = cx - ax, cy - ay
    t = (qx * sy - qy * sx) / denominator
    u = (qx * ry - qy * rx) / denominator
    return t if -1e-12 <= t <= 1 + 1e-12 and -1e-12 <= u <= 1 + 1e-12 else None


def boundary_segments(polygons: list[Polygon]) -> Iterable[tuple[Point, Point]]:
    for polygon in polygons:
        for ring in polygon:
            yield from zip(ring, ring[1:])


def clip_line(line: list[Point], polygons: list[Polygon]) -> list[list[Point]]:
    boundaries = list(boundary_segments(polygons))
    parts: list[list[Point]] = []
    current: list[Point] = []

    for a, b in zip(line, line[1:]):
        values = [0.0, 1.0]
        min_x, max_x = sorted((a[0], b[0]))
        min_y, max_y = sorted((a[1], b[1]))
        for c, d in boundaries:
            if max(c[0], d[0]) < min_x or min(c[0], d[0]) > max_x:
                continue
            if max(c[1], d[1]) < min_y or min(c[1], d[1]) > max_y:
                continue
            t = segment_intersection_t(a, b, c, d)
            if t is not None:
                values.append(max(0.0, min(1.0, t)))

        values = sorted(set(round(value, 12) for value in values))
        for start_t, end_t in zip(values, values[1:]):
            mid_t = (start_t + end_t) / 2
            midpoint = [a[0] + (b[0] - a[0]) * mid_t, a[1] + (b[1] - a[1]) * mid_t]
            if not point_in_study_area(midpoint, polygons):
                if len(current) >= 2:
                    parts.append(current)
                current = []
                continue

            start = [a[0] + (b[0] - a[0]) * start_t, a[1] + (b[1] - a[1]) * start_t]
            end = [a[0] + (b[0] - a[0]) * end_t, a[1] + (b[1] - a[1]) * end_t]
            if not current or current[-1] != start:
                if len(current) >= 2:
                    parts.append(current)
                current = [start]
            current.append(end)

    if len(current) >= 2:
        parts.append(current)
    return parts


def build_feature(elements: list[dict], road: dict, polygons: list[Polygon]) -> dict:
    matching = [
        element
        for element in elements
        if element.get("tags", {}).get("name") == road["source_name"]
        and len(element.get("geometry", [])) >= 2
    ]
    lines = []
    for element in matching:
        line = [[point["lon"], point["lat"]] for point in element["geometry"]]
        lines.extend(clip_line(line, polygons))
    return {
        "type": "Feature",
        "properties": {
            "اسم_الطريق": road["name_ar"],
            "name_en": road["name_en"],
            "source": "OpenStreetMap",
            "osm_way_count": len(matching),
            "visible_part_count": len(lines),
        },
        "geometry": {"type": "MultiLineString", "coordinates": lines},
    }


def main() -> None:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    study_source = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("public/data/map/Study_Area_Sector.geojson")
    data = load_overpass(source)
    elements = data.get("elements", [])
    polygons = load_study_polygons(study_source)
    if not polygons:
        raise ValueError(f"No study-area polygons found in {study_source}")
    output_roots = [Path("public/data"), Path("public/data/map")]

    for key, road in ROADS.items():
        feature = build_feature(elements, road, polygons)
        collection = {"type": "FeatureCollection", "features": [feature]}
        for root in output_roots:
            root.mkdir(parents=True, exist_ok=True)
            (root / f"{key}.geojson").write_text(
                json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
        print(
            f"{key}: {feature['properties']['osm_way_count']} OSM ways, "
            f"{feature['properties']['visible_part_count']} visible parts"
        )


if __name__ == "__main__":
    main()
