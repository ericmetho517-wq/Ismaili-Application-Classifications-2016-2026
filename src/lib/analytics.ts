import type { AnyFC, SummaryItem } from "@/lib/data";
import { concentration, median, sizeBuckets } from "@/lib/histogram";

export const FIELDS = {
  areaKm2: "مساحة_كم2",
  areaKm2Alt: "المساحة_كم2",
  changeAreaKm2: "مساحة_التغير_كم2",
  feddan: "المساحة_فدان",
  sector: "اسم_القطاع",
  axis: "اسم_المحور",
  useCode: "استخدام_الأرض",
  useDesc: "وصف_الاستخدام",
  changeStatus: "حالة_التغير",
  urbanType: "نمط_العمران",
  crop: "أنواع_المحاصيل_المزروعة",
  ownership: "نوع_ملكية_الأرض",
  waterName: "اسم_المسطح",
  landPrice2026: "سعر_الأرض_2026",
  landPrice2016: "سعر_الأرض_2016",
  rent2026: "سعر_الايجار_زراعية_2026",
  rent2016: "سعر_الايجار_زراعية_2016",
  rent2024: "سعر_الايجار_زراعية_2024",
  priceDiff: "فرق_السعر",
  rentDiff: "فرق_سعر_الايجار",
} as const;

export type DetailRow = {
  id: string;
  name: string;
  type: string;
  sector: string;
  axis: string;
  area_km2: number;
  feddan: number;
  raw: Record<string, any>;
};

export type Metric = {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  tone?: "brand" | "accent" | "urban" | "agri" | "industrial" | "water";
};

const UNSPECIFIED = "غير محدد";

export function cleanText(value: unknown, fallback = UNSPECIFIED) {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text || text === "null" || text === "undefined" || text.toLowerCase() === "nan") {
    return fallback;
  }
  return text;
}

export function asNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function featureAreaKm2(props: Record<string, any> | undefined) {
  const p = props ?? {};
  const direct =
    asNumber(p[FIELDS.areaKm2]) ||
    asNumber(p[FIELDS.areaKm2Alt]) ||
    asNumber(p[FIELDS.changeAreaKm2]);
  if (direct > 0) return direct;
  return (asNumber(p.SHAPE_Area) || asNumber(p.Shape_Area)) / 1_000_000;
}

export function featureFeddan(props: Record<string, any> | undefined) {
  const p = props ?? {};
  return asNumber(p[FIELDS.feddan]) || featureAreaKm2(p) * 247.105;
}

export function groupByField(
  fc: AnyFC | undefined,
  field: string,
  options: { top?: number; fallback?: string; area?: (props: Record<string, any>) => number } = {},
): SummaryItem[] {
  if (!fc) return [];
  const map = new Map<string, { area: number; count: number }>();
  const areaFn = options.area ?? featureAreaKm2;
  for (const feature of fc.features) {
    const props = feature.properties ?? {};
    const name = cleanText(props[field], options.fallback);
    const current = map.get(name) ?? { area: 0, count: 0 };
    current.area += areaFn(props);
    current.count += 1;
    map.set(name, current);
  }
  return [...map.entries()]
    .map(([name, value]) => ({
      name,
      area_km2: +value.area.toFixed(4),
      count: value.count,
    }))
    .sort((a, b) => b.area_km2 - a.area_km2)
    .slice(0, options.top ?? 20);
}

export function rowsFromFeatures(
  fc: AnyFC | undefined,
  options: { nameField?: string; typeField?: string; limit?: number; areaUnit?: "km2" | "feddan" } = {},
): DetailRow[] {
  if (!fc) return [];
  const rows = fc.features.map((feature, index) => {
    const raw = feature.properties ?? {};
    const name = cleanText(raw[options.nameField ?? FIELDS.useDesc], `#${index + 1}`);
    return {
      id: cleanText(raw.GlobalID, `${index}`),
      name,
      type: cleanText(raw[options.typeField ?? FIELDS.useDesc], name),
      sector: cleanText(raw[FIELDS.sector]),
      axis: cleanText(raw[FIELDS.axis]),
      area_km2: featureAreaKm2(raw),
      feddan: featureFeddan(raw),
      raw,
    };
  });
  const sorted = rows.sort((a, b) => {
    const va = options.areaUnit === "feddan" ? a.feddan : a.area_km2;
    const vb = options.areaUnit === "feddan" ? b.feddan : b.area_km2;
    return vb - va;
  });
  return sorted.slice(0, options.limit ?? 250);
}

export function areaStats(fc: AnyFC | undefined) {
  const values = fc?.features.map((f) => featureAreaKm2(f.properties ?? {})).filter((v) => v > 0) ?? [];
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    count: values.length,
    total: +total.toFixed(4),
    avg: values.length ? +(total / values.length).toFixed(4) : 0,
    median: +median(values).toFixed(4),
    largest: values.length ? +Math.max(...values).toFixed(4) : 0,
    smallest: values.length ? +Math.min(...values).toFixed(4) : 0,
    concentration10: +concentration(values, 0.1).toFixed(1),
    values,
  };
}

export function topFeatures(
  fc: AnyFC | undefined,
  options: { nameField?: string; typeField?: string; top?: number; areaUnit?: "km2" | "feddan" } = {},
): SummaryItem[] {
  return rowsFromFeatures(fc, { ...options, limit: options.top ?? 15 }).map((row) => ({
    name: row.name,
    area_km2: options.areaUnit === "feddan" ? +row.feddan.toFixed(2) : +row.area_km2.toFixed(4),
    count: 1,
  }));
}

export function km2Buckets(values: number[]): SummaryItem[] {
  return sizeBuckets(values, [
    { label: "< 0.01", min: 0, max: 0.01 },
    { label: "0.01 - 0.05", min: 0.01, max: 0.05 },
    { label: "0.05 - 0.2", min: 0.05, max: 0.2 },
    { label: "0.2 - 1", min: 0.2, max: 1 },
    { label: "1+", min: 1, max: Infinity },
  ]);
}

export function priceMetrics(fc: AnyFC | undefined): Metric[] {
  if (!fc) return [];
  const collect = (field: string) =>
    fc.features
      .map((f) => asNumber((f.properties ?? {})[field]))
      .filter((value) => value > 0)
      .sort((a, b) => a - b);
  const build = (label: string, field: string, unit: string): Metric | null => {
    const values = collect(field);
    if (!values.length) return null;
    const total = values.reduce((sum, value) => sum + value, 0);
    return {
      label,
      value: +(total / values.length).toFixed(0),
      unit,
      hint: `وسيط ${Math.round(median(values))} · ${values.length} عنصر`,
      tone: "accent",
    };
  };
  return [
    build("متوسط سعر الأرض 2026", FIELDS.landPrice2026, "جنيه"),
    build("متوسط سعر الأرض 2016", FIELDS.landPrice2016, "جنيه"),
    build("متوسط إيجار زراعي 2026", FIELDS.rent2026, "جنيه"),
    build("متوسط إيجار زراعي 2024", FIELDS.rent2024, "جنيه"),
  ].filter(Boolean) as Metric[];
}

export function metricsFromStats(stats: ReturnType<typeof areaStats>, label = "العناصر"): Metric[] {
  return [
    { label: `إجمالي ${label}`, value: stats.total, unit: "كم²", tone: "brand" },
    { label: "عدد العناصر", value: stats.count, tone: "accent" },
    { label: "متوسط المساحة", value: stats.avg, unit: "كم²", tone: "urban" },
    { label: "الوسيط", value: stats.median, unit: "كم²", tone: "agri" },
    { label: "أكبر عنصر", value: stats.largest, unit: "كم²", tone: "industrial" },
    { label: "تركيز أعلى 10%", value: stats.concentration10, unit: "%", tone: "water" },
  ];
}
