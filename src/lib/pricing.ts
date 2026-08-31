import type { PricingRow } from "@/lib/data";

export type PricingDomain = "urban" | "agri" | "industrial" | "services";

export type UnitPriceRow = {
  id: string;
  use: string;
  landUseCode: number;
  areaM2: number;
  total2016: number;
  total2026: number;
  rate2016: number;
  rate2026: number;
};

export type UnitPriceStats = {
  count: number;
  areaM2: number;
  total2016: number;
  total2026: number;
  averageRate2016: number;
  averageRate2026: number;
  growth: number;
};

const EMPTY_STATS: UnitPriceStats = {
  count: 0,
  areaM2: 0,
  total2016: 0,
  total2026: 0,
  averageRate2016: 0,
  averageRate2026: 0,
  growth: 0,
};

function normalizedUse(use: string) {
  return use.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar");
}

export function pricingDomain(use: string, landUseCode?: number): PricingDomain | "other" {
  const value = normalizedUse(use);

  // Explicit descriptions win when a source code conflicts with the feature name.
  if (/زراع|صوب|مزارع|دواجن|حيواني|تفريخ|محاصيل|مزرعة|مشاتل/.test(value)) return "agri";
  if (/مصنع|مصانع|صناع|شركة|شركه|مخزن|مخازن|محجر|مجمع صناعي|ورش|ورشة|factory|industr|manufacturer|plant|steel|plastic|textile/.test(value)) {
    return "industrial";
  }
  if (/سكن|حضر|عمران|مباني|residen|urban/.test(value)) return "urban";
  if (/خدم|مدرس|جامع|مستشف|نادي|مسجد|كنيس|مقابر|فندق|قرية سياحية|مول|سوق|محطة|مركز طبي/.test(value)) return "services";
  if (/ارض فضاء|أرض فضاء|vacant/.test(value)) return "other";

  if (landUseCode === 3) return "urban";
  if (landUseCode === 0) return "agri";
  if (landUseCode === 1) return "industrial";
  if ([5, 6, 7, 11, 12, 13, 14, 111].includes(landUseCode ?? Number.NaN)) return "services";
  return "other";
}

export function unitPriceRows(rows: PricingRow[] | undefined): UnitPriceRow[] {
  if (!rows) return [];
  return rows.flatMap((item) => {
    const areaM2 = Number(item.area_m2);
    const total2016 = Number(item.price_2016);
    const total2026 = Number(item.price_2026);
    if (!(areaM2 > 0 && total2016 > 0 && total2026 > 0)) return [];
    return [{
      id: String(item.id),
      use: String(item.use || "غير محدد").trim(),
      landUseCode: Number(item.land_use_code),
      areaM2,
      total2016,
      total2026,
      rate2016: total2016 / areaM2,
      rate2026: total2026 / areaM2,
    }];
  });
}

export function summarizeUnitPrices(rows: UnitPriceRow[]): UnitPriceStats {
  if (!rows.length) return EMPTY_STATS;
  const areaM2 = rows.reduce((sum, row) => sum + row.areaM2, 0);
  const total2016 = rows.reduce((sum, row) => sum + row.total2016, 0);
  const total2026 = rows.reduce((sum, row) => sum + row.total2026, 0);
  const averageRate2016 = total2016 / areaM2;
  const averageRate2026 = total2026 / areaM2;
  return {
    count: rows.length,
    areaM2,
    total2016,
    total2026,
    averageRate2016,
    averageRate2026,
    growth: averageRate2016 > 0 ? ((averageRate2026 - averageRate2016) / averageRate2016) * 100 : 0,
  };
}

export function groupUnitPrices(rows: UnitPriceRow[]) {
  const grouped = new Map<string, UnitPriceRow[]>();
  for (const row of rows) grouped.set(row.use, [...(grouped.get(row.use) ?? []), row]);
  return [...grouped.entries()]
    .map(([name, values]) => {
      const stats = summarizeUnitPrices(values);
      return {
        name,
        count: stats.count,
        rate2016: Math.round(stats.averageRate2016),
        rate2026: Math.round(stats.averageRate2026),
        growth: +stats.growth.toFixed(1),
      };
    })
    .sort((a, b) => b.count - a.count);
}
