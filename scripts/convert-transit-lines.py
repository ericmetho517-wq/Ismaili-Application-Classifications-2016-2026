from __future__ import annotations

import json
import math
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


LAYERS = [
    ("انفاق/GreenLine.kmz", "Transit_GreenLine", "الخط الأخضر"),
    ("انفاق/LINE4.kmz", "Transit_Metro4", "مترو الخط الرابع"),
    ("انفاق/LINE_1.kmz", "Transit_Metro1", "مترو الخط الأول"),
    ("انفاق/LINE_2.kmz", "Transit_Metro2", "مترو الخط الثاني"),
    ("انفاق/LINE_3.kmz", "Transit_Metro3", "مترو الخط الثالث"),
    ("انفاق/LINE_6.kmz", "Transit_Metro6", "مترو الخط السادس"),
    ("انفاق/LRT.kmz", "Transit_LRT", "القطار الكهربائي الخفيف LRT"),
    ("انفاق/Monorail October.kmz", "Transit_MonorailOctober", "مونوريل أكتوبر"),
    ("انفاق/Monorail_Capital.kmz", "Transit_MonorailCapital", "مونوريل العاصمة"),
    (
        "حدود هيئة السكة الحديد ومحافظات الجمهورية/الروبيكى_بلبيس_22-4-2024new.kmz",
        "Transit_RobikiBelbeis",
        "خط الروبيكي - بلبيس",
    ),
    (
        "حدود هيئة السكة الحديد ومحافظات الجمهورية/وصلة كفر داوود - السادات.kml",
        "Transit_KafrDawoodSadat",
        "وصلة كفر داوود - السادات",
    ),
]

CAD_LINE_NAMES = {
    "Transit_LRT": {"Polyline [E167]:0", "Polyline [E165]:0", "Polyline [E147]:0"},
    "Transit_Metro6": {"Polyline [5062]:0"},
    "Transit_MonorailOctober": {"Block Reference [19B05]:1"},
    "Transit_MonorailCapital": {"Block Reference [90B7]:0"},
}

# These are the routes intentionally shown in every dashboard. Keep each
# selected route complete even when parts of it continue beyond the study box.
COMPLETE_ROUTE_KEYS = {
    "Transit_Metro1",
    "Transit_Metro3",
    "Transit_Metro4",
    "Transit_LRT",
    "Transit_MonorailCapital",
    "Transit_RobikiBelbeis",
}

def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def read_kml(path: Path) -> bytes:
    if path.suffix.lower() == ".kml":
        return path.read_bytes()
    with zipfile.ZipFile(path) as archive:
        kml_name = next(name for name in archive.namelist() if name.lower().endswith(".kml"))
        return archive.read(kml_name)


def parse_coordinates(text: str | None) -> list[list[float]]:
    coordinates: list[list[float]] = []
    for token in (text or "").replace("\n", " ").replace("\t", " ").split():
        values = token.split(",")
        if len(values) < 2:
            continue
        try:
            lon, lat = float(values[0]), float(values[1])
        except ValueError:
            continue
        if -180 <= lon <= 180 and -90 <= lat <= 90:
            coordinates.append([lon, lat])
    return coordinates


def placemark_name(placemark: ET.Element, fallback: str) -> str:
    for child in placemark:
        if local_name(child.tag) == "name" and child.text and child.text.strip():
            return child.text.strip()
    return fallback


def line_length_km(coordinates: list[list[float]]) -> float:
    total = 0.0
    for start, end in zip(coordinates, coordinates[1:]):
        latitude = math.radians((start[1] + end[1]) / 2)
        total += math.hypot((end[0] - start[0]) * math.cos(latitude), end[1] - start[1]) * 111
    return total


def simplify_line(points: list[list[float]], tolerance: float = 0.00008) -> list[list[float]]:
    if len(points) <= 2:
        return points
    keep = {0, len(points) - 1}
    stack = [(0, len(points) - 1)]
    tolerance_sq = tolerance * tolerance
    while stack:
        start_index, end_index = stack.pop()
        start, end = points[start_index], points[end_index]
        dx, dy = end[0] - start[0], end[1] - start[1]
        segment_sq = dx * dx + dy * dy
        furthest_index = -1
        furthest_distance = 0.0
        for index in range(start_index + 1, end_index):
            point = points[index]
            if segment_sq == 0:
                distance = (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2
            else:
                ratio = max(0.0, min(1.0, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / segment_sq))
                projected_x, projected_y = start[0] + ratio * dx, start[1] + ratio * dy
                distance = (point[0] - projected_x) ** 2 + (point[1] - projected_y) ** 2
            if distance > furthest_distance:
                furthest_index, furthest_distance = index, distance
        if furthest_index >= 0 and furthest_distance > tolerance_sq:
            keep.add(furthest_index)
            stack.extend(((start_index, furthest_index), (furthest_index, end_index)))
    return [points[index] for index in sorted(keep)]


def coordinate_bounds(value: object) -> tuple[float, float, float, float]:
    points: list[list[float]] = []

    def visit(item: object) -> None:
        if isinstance(item, list) and len(item) >= 2 and all(isinstance(number, (int, float)) for number in item[:2]):
            points.append(item)
        elif isinstance(item, list):
            for child in item:
                visit(child)

    visit(value)
    return (
        min(point[0] for point in points),
        min(point[1] for point in points),
        max(point[0] for point in points),
        max(point[1] for point in points),
    )


def load_clip_bounds(path: Path, padding: float = 0.015) -> tuple[float, float, float, float]:
    collection = json.loads(path.read_text(encoding="utf-8"))
    bounds = coordinate_bounds([feature["geometry"]["coordinates"] for feature in collection["features"]])
    return bounds[0] - padding, bounds[1] - padding, bounds[2] + padding, bounds[3] + padding


def clip_segment(
    start: list[float],
    end: list[float],
    bounds: tuple[float, float, float, float],
) -> tuple[list[float], list[float]] | None:
    min_x, min_y, max_x, max_y = bounds
    dx, dy = end[0] - start[0], end[1] - start[1]
    p = (-dx, dx, -dy, dy)
    q = (start[0] - min_x, max_x - start[0], start[1] - min_y, max_y - start[1])
    low, high = 0.0, 1.0
    for direction, distance in zip(p, q):
        if direction == 0:
            if distance < 0:
                return None
            continue
        ratio = distance / direction
        if direction < 0:
            low = max(low, ratio)
        else:
            high = min(high, ratio)
        if low > high:
            return None
    return (
        [start[0] + low * dx, start[1] + low * dy],
        [start[0] + high * dx, start[1] + high * dy],
    )


def clip_line(points: list[list[float]], bounds: tuple[float, float, float, float]) -> list[list[list[float]]]:
    parts: list[list[list[float]]] = []
    current: list[list[float]] = []
    for start, end in zip(points, points[1:]):
        clipped = clip_segment(start, end, bounds)
        if clipped is None:
            if len(current) >= 2:
                parts.append(current)
            current = []
            continue
        clipped_start, clipped_end = clipped
        if not current or current[-1] != clipped_start:
            if len(current) >= 2:
                parts.append(current)
            current = [clipped_start]
        if current[-1] != clipped_end:
            current.append(clipped_end)
    if len(current) >= 2:
        parts.append(current)
    return parts


def line_intersects_bounds(points: list[list[float]], bounds: tuple[float, float, float, float]) -> bool:
    return any(clip_segment(start, end, bounds) is not None for start, end in zip(points, points[1:]))


def merge_connected_lines(
    lines: list[list[list[float]]],
    tolerance: float = 0.002,
) -> list[list[list[float]]]:
    remaining = [line[:] for line in lines if len(line) >= 2]
    merged: list[list[list[float]]] = []

    def nearby(first: list[float], second: list[float]) -> bool:
        return math.hypot(first[0] - second[0], first[1] - second[1]) <= tolerance

    while remaining:
        current = remaining.pop(0)
        changed = True
        while changed:
            changed = False
            for index, candidate in enumerate(remaining):
                if nearby(current[-1], candidate[0]):
                    current.extend(candidate[1:])
                elif nearby(current[-1], candidate[-1]):
                    current.extend(reversed(candidate[:-1]))
                elif nearby(current[0], candidate[-1]):
                    current = candidate[:-1] + current
                elif nearby(current[0], candidate[0]):
                    current = list(reversed(candidate[1:])) + current
                else:
                    continue
                remaining.pop(index)
                changed = True
                break
        merged.append(current)
    return merged


def clean_features(features: list[dict], key: str) -> list[dict]:
    selected = features
    if key == "Transit_RobikiBelbeis" and selected:
        # The source KMZ is a full CAD drawing. Its longest continuous geometry
        # is the actual Robiki-Belbeis alignment; the rest are site details.
        selected = [max(selected, key=lambda feature: line_length_km(feature["geometry"]["coordinates"]))]
    if key in CAD_LINE_NAMES:
        selected = [feature for feature in selected if feature["properties"]["اسم_الجزء"] in CAD_LINE_NAMES[key]]
    precision = 3 if key in CAD_LINE_NAMES else 4
    unique: dict[tuple, dict] = {}
    for feature in selected:
        coordinates = feature["geometry"]["coordinates"]
        start = tuple(round(value, precision) for value in coordinates[0])
        end = tuple(round(value, precision) for value in coordinates[-1])
        identity = tuple(sorted((start, end)))
        current = unique.get(identity)
        if current is None or len(coordinates) > len(current["geometry"]["coordinates"]):
            feature["geometry"]["coordinates"] = simplify_line(coordinates)
            unique[identity] = feature
    return list(unique.values())


def convert(
    source: Path,
    output: Path,
    key: str,
    layer_name: str,
    clip_bounds: tuple[float, float, float, float] | None = None,
) -> int:
    raw = read_kml(source)
    raw = re.sub(br'\s+xsi:schemaLocation="[^"]*"', b"", raw)
    root = ET.fromstring(raw)
    features: list[dict] = []

    for placemark in (element for element in root.iter() if local_name(element.tag) == "Placemark"):
        name = placemark_name(placemark, layer_name)
        for line in (element for element in placemark.iter() if local_name(element.tag) == "LineString"):
            coordinate_node = next(
                (element for element in line.iter() if local_name(element.tag) == "coordinates"),
                None,
            )
            coordinates = parse_coordinates(coordinate_node.text if coordinate_node is not None else None)
            if len(coordinates) < 2:
                continue
            features.append(
                {
                    "type": "Feature",
                    "properties": {"اسم_الخط": layer_name, "اسم_الجزء": name},
                    "geometry": {"type": "LineString", "coordinates": coordinates},
                }
            )

    features = clean_features(features, key)
    if features:
        geometries = [feature["geometry"]["coordinates"] for feature in features]
        geometries = [geometry for geometry in geometries if line_length_km(geometry) >= 0.15]
        geometries = merge_connected_lines(geometries)
        if clip_bounds and key not in COMPLETE_ROUTE_KEYS:
            geometries = [geometry for geometry in geometries if line_intersects_bounds(geometry, clip_bounds)]
        geometries = sorted(geometries, key=line_length_km, reverse=True)
    if features and geometries:
        features = [
            {
                "type": "Feature",
                "properties": {"اسم_الخط": layer_name},
                "geometry": {
                    "type": "LineString" if len(geometries) == 1 else "MultiLineString",
                    "coordinates": geometries[0] if len(geometries) == 1 else geometries,
                },
            }
        ]
    else:
        features = []

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    return len(features)


def main() -> None:
    if len(sys.argv) not in (3, 4):
        raise SystemExit("Usage: convert-transit-lines.py SOURCE_DIR OUTPUT_DIR [STUDY_AREA_GEOJSON]")
    source_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    clip_bounds = load_clip_bounds(Path(sys.argv[3])) if len(sys.argv) == 4 else None
    for relative_path, key, label in LAYERS:
        source = source_dir / Path(relative_path)
        count = convert(source, output_dir / f"{key}.geojson", key, label, clip_bounds)
        print(f"{key}: {count} line parts")


if __name__ == "__main__":
    main()
