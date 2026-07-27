import type { SummaryItem, AnyFC } from "@/lib/data";

/** Bucket numeric values into labelled ranges. Returns SummaryItem[] shape so
 *  charts that accept SummaryItem can render histograms as well. */
export function sizeBuckets(
  values: number[],
  edges: { label: string; min: number; max: number }[],
): SummaryItem[] {
  return edges.map((e) => {
    const inBucket = values.filter((v) => v >= e.min && v < e.max);
    const area = +inBucket.reduce((s, v) => s + v, 0).toFixed(3);
    return { name: e.label, area_km2: area, count: inBucket.length };
  });
}

/** Convert a feature collection to top-N items by an area property (km²). */
export function topNByArea(
  fc: AnyFC | undefined,
  nameKey: string,
  areaKey: string,
  n = 10,
  scale = 1, // multiply raw value to convert to km² if needed
): SummaryItem[] {
  if (!fc) return [];
  const map = new Map<string, { area: number; count: number }>();
  for (const f of fc.features) {
    const p = f.properties || {};
    let name = (p[nameKey] ?? "غير محدد") as string;
    if (!name || name === "null" || name === "undefined") name = "غير محدد";
    name = String(name).trim().slice(0, 60);
    const v = Number(p[areaKey] ?? 0) * scale;
    const prev = map.get(name) || { area: 0, count: 0 };
    map.set(name, { area: prev.area + v, count: prev.count + 1 });
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, area_km2: +v.area.toFixed(3), count: v.count }))
    .sort((a, b) => b.area_km2 - a.area_km2)
    .slice(0, n);
}

/** Compute median of a numeric array. */
export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Concentration: fraction of total held by the largest p% items. */
export function concentration(values: number[], topFraction = 0.1): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(s.length * topFraction));
  const top = s.slice(0, k).reduce((a, b) => a + b, 0);
  const all = s.reduce((a, b) => a + b, 0) || 1;
  return (top / all) * 100;
}
