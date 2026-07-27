import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowDownUp,
  Banknote,
  Building2,
  Calculator,
  Database,
  Factory,
  MapIcon,
  Search,
  Sprout,
  TrendingUp,
} from "lucide-react";
import { loadPricingData, loadSummary } from "@/lib/data";
import { asNumber, cleanText, FIELDS, type Metric } from "@/lib/analytics";
import { median } from "@/lib/histogram";
import { formatNum, useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { Panel } from "@/components/Panel";
import { MetricStrip } from "@/components/MetricStrip";
import { InsightCard } from "@/components/InsightCard";
import { MapViewClient } from "@/components/MapViewClient";
import {
  PriceBandChart,
  PriceComparisonChart,
  PriceGrowthChart,
  type PriceGroup,
} from "@/components/PriceCharts";

export const Route = createFileRoute("/prices")({
  head: () => ({
    meta: [
      { title: "لوحة أسعار الأراضي 2016–2026 — الإسماعيلية" },
      {
        name: "description",
        content:
          "Detailed land-price dashboard comparing 2016 and 2026 parcel values and unit prices across Ismailia.",
      },
    ],
  }),
  component: PricesPage,
});

type PriceRow = {
  id: string;
  use: string;
  areaM2: number;
  total2016: number;
  total2026: number;
  rate2016: number;
  rate2026: number;
  difference: number;
  growth: number;
};

type PriceStats = {
  count: number;
  areaM2: number;
  total2016: number;
  total2026: number;
  averageTotal2016: number;
  averageTotal2026: number;
  averageRate2016: number;
  averageRate2026: number;
  medianRate2016: number;
  medianRate2026: number;
  minRate2016: number;
  minRate2026: number;
  maxRate2016: number;
  maxRate2026: number;
  growth: number;
  increased: number;
  decreased: number;
};

const EMPTY_STATS: PriceStats = {
  count: 0,
  areaM2: 0,
  total2016: 0,
  total2026: 0,
  averageTotal2016: 0,
  averageTotal2026: 0,
  averageRate2016: 0,
  averageRate2026: 0,
  medianRate2016: 0,
  medianRate2026: 0,
  minRate2016: 0,
  minRate2026: 0,
  maxRate2016: 0,
  maxRate2026: 0,
  growth: 0,
  increased: 0,
  decreased: 0,
};

function summarize(rows: PriceRow[]): PriceStats {
  if (!rows.length) return EMPTY_STATS;
  const areaM2 = rows.reduce((sum, row) => sum + row.areaM2, 0);
  const total2016 = rows.reduce((sum, row) => sum + row.total2016, 0);
  const total2026 = rows.reduce((sum, row) => sum + row.total2026, 0);
  const rates2016 = rows.map((row) => row.rate2016).sort((a, b) => a - b);
  const rates2026 = rows.map((row) => row.rate2026).sort((a, b) => a - b);
  const averageRate2016 = areaM2 > 0 ? total2016 / areaM2 : 0;
  const averageRate2026 = areaM2 > 0 ? total2026 / areaM2 : 0;
  return {
    count: rows.length,
    areaM2,
    total2016,
    total2026,
    averageTotal2016: total2016 / rows.length,
    averageTotal2026: total2026 / rows.length,
    averageRate2016,
    averageRate2026,
    medianRate2016: median(rates2016),
    medianRate2026: median(rates2026),
    minRate2016: rates2016[0] ?? 0,
    minRate2026: rates2026[0] ?? 0,
    maxRate2016: rates2016.at(-1) ?? 0,
    maxRate2026: rates2026.at(-1) ?? 0,
    growth: averageRate2016 > 0 ? ((averageRate2026 - averageRate2016) / averageRate2016) * 100 : 0,
    increased: rows.filter((row) => row.total2026 > row.total2016).length,
    decreased: rows.filter((row) => row.total2026 < row.total2016).length,
  };
}

function groupPrices(rows: PriceRow[]): PriceGroup[] {
  const groups = new Map<string, PriceRow[]>();
  rows.forEach((row) => {
    const group = groups.get(row.use);
    if (group) group.push(row);
    else groups.set(row.use, [row]);
  });
  return [...groups.entries()]
    .map(([name, values]) => {
      const stats = summarize(values);
      return {
        name,
        count: values.length,
        rate2016: +stats.averageRate2016.toFixed(0),
        rate2026: +stats.averageRate2026.toFixed(0),
        growth: +stats.growth.toFixed(1),
      };
    })
    .sort((a, b) => b.count - a.count);
}

type PriceCategoryKey = "buildings" | "industrial" | "agricultural";
type PriceCategory = PriceCategoryKey | "other";

const CATEGORY_COLORS: Record<PriceCategoryKey, string> = {
  buildings: "#2563eb",
  industrial: "#ea580c",
  agricultural: "#16a34a",
};

const PRICE_CATEGORIES: Array<{
  key: PriceCategoryKey;
  labelAr: string;
  labelEn: string;
  color: string;
}> = [
  {
    key: "buildings",
    labelAr: "المباني والاستخدام السكني",
    labelEn: "Buildings & residential",
    color: CATEGORY_COLORS.buildings,
  },
  {
    key: "industrial",
    labelAr: "الأراضي الصناعية",
    labelEn: "Industrial land",
    color: CATEGORY_COLORS.industrial,
  },
  {
    key: "agricultural",
    labelAr: "الأراضي والأنشطة الزراعية",
    labelEn: "Agricultural land & activities",
    color: CATEGORY_COLORS.agricultural,
  },
];

function priceCategory(use: string): PriceCategory {
  const normalized = use.replace(/\s+/g, " ").trim().toLocaleLowerCase("ar");
  if (/زراع|صوب|مزارع|دواجن|حيواني|تفريخ|محاصيل/.test(normalized)) return "agricultural";
  if (/سكن|مباني|عمران|تجاري|إداري|اداري|خدمي/.test(normalized)) return "buildings";
  if (/ارض فضاء|أرض فضاء|vacant/.test(normalized)) return "other";
  if (/مصنع|مصانع|صناع|شركة|شركه|مخزن|مخازن|مجمع|factory|industr|manufacturer|plant|steel|plastic|textile/.test(normalized)) return "industrial";
  // Remaining named records belong to the industrial inventory in the source dataset.
  return "industrial";
}

function CategoryPriceCard({
  category,
  stats,
  lang,
}: {
  category: (typeof PRICE_CATEGORIES)[number];
  stats: PriceStats;
  lang: "ar" | "en";
}) {
  const difference = stats.total2026 - stats.total2016;
  const growth = stats.total2016 > 0 ? (difference / stats.total2016) * 100 : 0;
  const Icon =
    category.key === "agricultural" ? Sprout : category.key === "industrial" ? Factory : Building2;
  const rows = [
    [
      lang === "ar" ? "إجمالي المساحة" : "Total area",
      formatNum(stats.areaM2 / 1_000_000, lang, 2),
      lang === "ar" ? "كم²" : "km²",
    ],
    [
      lang === "ar" ? "إجمالي أسعار 2016" : "Total value 2016",
      formatNum(stats.total2016, lang, 0),
      lang === "ar" ? "جنيه" : "EGP",
    ],
    [
      lang === "ar" ? "إجمالي أسعار 2026" : "Total value 2026",
      formatNum(stats.total2026, lang, 0),
      lang === "ar" ? "جنيه" : "EGP",
    ],
    [
      lang === "ar" ? "فرق الأسعار" : "Value difference",
      `${difference >= 0 ? "+" : ""}${formatNum(difference, lang, 0)}`,
      lang === "ar" ? "جنيه" : "EGP",
    ],
    [
      lang === "ar" ? "متوسط سعر المتر 2016" : "Avg. unit price 2016",
      formatNum(stats.averageRate2016, lang, 0),
      lang === "ar" ? "جنيه/م²" : "EGP/m²",
    ],
    [
      lang === "ar" ? "متوسط سعر المتر 2026" : "Avg. unit price 2026",
      formatNum(stats.averageRate2026, lang, 0),
      lang === "ar" ? "جنيه/م²" : "EGP/m²",
    ],
  ];

  return (
    <article
      className="overflow-hidden rounded-xl border-2 shadow-sm"
      style={{
        borderColor: `${category.color}70`,
        background: `linear-gradient(155deg, ${category.color}18, var(--color-card) 46%)`,
        boxShadow: `0 10px 28px ${category.color}18`,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: `${category.color}45`, background: `linear-gradient(135deg, ${category.color}32, ${category.color}0b)` }}
      >
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-foreground">
            {lang === "ar" ? category.labelAr : category.labelEn}
          </h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {formatNum(stats.count, lang, 0)} {lang === "ar" ? "قطعة مسعّرة" : "priced parcels"}
          </p>
        </div>
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
          style={{ color: category.color, backgroundColor: `${category.color}18` }}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <div className="divide-y divide-border/70 px-4">
        {rows.map(([label, value, unit]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[10px] text-muted-foreground sm:text-[11px]">{label}</span>
            <span className="min-w-0 text-end text-xs font-bold tabular-nums text-foreground sm:text-sm">
              <bdi>{value}</bdi> <small className="font-medium text-muted-foreground">{unit}</small>
            </span>
          </div>
        ))}
      </div>

      <div
        className="flex items-center justify-between border-t border-border px-4 py-3"
        style={{ backgroundColor: `${category.color}0c` }}
      >
        <span className="text-[11px] font-semibold text-foreground">
          {lang === "ar" ? "نسبة الزيادة 2016–2026" : "Growth 2016–2026"}
        </span>
        <strong className="text-lg tabular-nums" style={{ color: category.color }}>
          {growth >= 0 ? "+" : ""}
          {formatNum(growth, lang, 1)}%
        </strong>
      </div>
    </article>
  );
}

function BusinessPriceCard({
  label,
  stats,
  color,
  grandTotal2026,
  lang,
}: {
  label: string;
  stats: PriceStats;
  color: string;
  grandTotal2026: number;
  lang: "ar" | "en";
}) {
  const difference = stats.total2026 - stats.total2016;
  const growth = stats.total2016 > 0 ? (difference / stats.total2016) * 100 : 0;
  const share = grandTotal2026 > 0 ? (stats.total2026 / grandTotal2026) * 100 : 0;
  const currency = lang === "ar" ? "جنيه مصري" : "EGP";
  const compactMoney = (value: number) => {
    const magnitude = Math.abs(value);
    if (magnitude >= 1_000_000_000_000) {
      return { value: formatNum(value / 1_000_000_000_000, lang, 2), unit: lang === "ar" ? "تريليون جنيه" : "tn EGP" };
    }
    if (magnitude >= 1_000_000_000) {
      return { value: formatNum(value / 1_000_000_000, lang, 2), unit: lang === "ar" ? "مليار جنيه" : "bn EGP" };
    }
    if (magnitude >= 1_000_000) {
      return { value: formatNum(value / 1_000_000, lang, 2), unit: lang === "ar" ? "مليون جنيه" : "m EGP" };
    }
    return { value: formatNum(value, lang, 0), unit: currency };
  };
  const current = compactMoney(stats.total2026);
  const baseline = compactMoney(stats.total2016);
  const change = compactMoney(difference);

  return (
    <article
      className="relative overflow-hidden rounded-xl border-2 shadow-sm"
      style={{
        borderColor: `${color}75`,
        background: `linear-gradient(155deg, ${color}1c, var(--color-card) 48%)`,
        boxShadow: `0 12px 30px ${color}1c`,
      }}
    >
      <div className="border-b px-4 pb-4 pt-3" style={{ borderColor: `${color}45`, background: `linear-gradient(135deg, ${color}38, ${color}0d 72%)` }}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-extrabold text-foreground">{label}</h3>
          <span className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold" style={{ borderColor: `${color}45`, backgroundColor: `${color}12`, color }}>
            {lang === "ar" ? "قيمة 2026" : "2026 value"}
          </span>
        </div>
        <p className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1" dir="ltr">
          <strong className="whitespace-nowrap text-[clamp(1.55rem,2vw,2rem)] font-black leading-none tracking-[-0.04em] tabular-nums" style={{ color }}>
            {current.value}
          </strong>
          <span className="pb-0.5 text-xs font-bold text-muted-foreground">{current.unit}</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[10px] text-muted-foreground">
          <span>{lang === "ar" ? "القيمة الدقيقة:" : "Exact value:"}</span>
          <bdi dir="ltr" className="font-bold text-foreground tabular-nums">{formatNum(stats.total2026, lang, 0)} {currency}</bdi>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: `${color}48` }}>
        <div className="px-4 py-3" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, var(--color-card))` }}>
          <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "خط الأساس 2016" : "2016 baseline"}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1" dir="ltr">
            <strong className="text-base font-extrabold text-foreground tabular-nums">{baseline.value}</strong>
            <span className="text-[9px] font-semibold text-muted-foreground">{baseline.unit}</span>
          </p>
          <p className="mt-1 whitespace-nowrap text-[9px] text-muted-foreground tabular-nums" dir="ltr">{formatNum(stats.total2016, lang, 0)}</p>
        </div>
        <div className="px-4 py-3" style={{ backgroundColor: `color-mix(in srgb, ${color} 8%, var(--color-card))` }}>
          <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "الزيادة في القيمة" : "Value increase"}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-1" dir="ltr">
            <strong className="text-base font-extrabold tabular-nums" style={{ color }}>{difference >= 0 ? "+" : ""}{change.value}</strong>
            <span className="text-[9px] font-semibold text-muted-foreground">{change.unit}</span>
          </p>
          <p className="mt-1 whitespace-nowrap text-[9px] text-muted-foreground tabular-nums" dir="ltr">{difference >= 0 ? "+" : ""}{formatNum(difference, lang, 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-t px-4 py-3 text-center" style={{ borderColor: `${color}45`, backgroundColor: `${color}16` }}>
        <div className="border-e border-border">
          <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "النمو 2016–2026" : "Growth 2016–2026"}</p>
          <strong className="mt-1 block text-lg font-black tabular-nums" style={{ color }} dir="ltr">{growth >= 0 ? "+" : ""}{formatNum(growth, lang, 1)}%</strong>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "الحصة من إجمالي 2026" : "Share of 2026 total"}</p>
          <strong className="mt-1 block text-lg font-black text-foreground tabular-nums" dir="ltr">{formatNum(share, lang, 1)}%</strong>
        </div>
      </div>
    </article>
  );
}

function BusinessAreaMetric({
  label,
  value,
  unit,
  tone,
  lang,
}: {
  label: string;
  value: number;
  unit: string;
  tone: string;
  lang: "ar" | "en";
}) {
  return (
    <div
      className="relative min-h-[104px] overflow-hidden rounded-lg border-2 px-3 py-3 text-center"
      style={{
        borderColor: `${tone}65`,
        background: `linear-gradient(145deg, ${tone}24, var(--color-card) 72%)`,
        boxShadow: `0 7px 20px ${tone}18`,
      }}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone }} />
      <p className="min-h-8 text-[10px] font-extrabold leading-4 text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-nowrap text-[clamp(1.15rem,1.55vw,1.45rem)] font-black tracking-tight tabular-nums" style={{ color: tone }} dir="ltr" title={formatNum(value, lang, value >= 1000 ? 0 : 2)}>
        {formatNum(value, lang, value >= 1000 ? 0 : 2)}
      </p>
      <p className="mt-1 text-[10px] font-bold text-muted-foreground">{unit}</p>
    </div>
  );
}

function makeBands(rows: PriceRow[]) {
  const bands = [
    { name: "< 500", min: 0, max: 500 },
    { name: "500–2k", min: 500, max: 2_000 },
    { name: "2k–5k", min: 2_000, max: 5_000 },
    { name: "5k–10k", min: 5_000, max: 10_000 },
    { name: "10k–20k", min: 10_000, max: 20_000 },
    { name: "20k+", min: 20_000, max: Number.POSITIVE_INFINITY },
  ];
  return bands.map((band) => ({
    name: band.name,
    count2016: rows.filter((row) => row.rate2016 >= band.min && row.rate2016 < band.max).length,
    count2026: rows.filter((row) => row.rate2026 >= band.min && row.rate2026 < band.max).length,
  }));
}

function PricesPage() {
  const { t, lang } = useI18n();
  const [selectedUse, setSelectedUse] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<"price2016" | "price2026" | "priceGrowth">("price2026");
  const { data: pricing } = useQuery({
    queryKey: ["pricing"],
    queryFn: loadPricingData,
  });
  const { data: summary } = useQuery({
    queryKey: ["summary"],
    queryFn: loadSummary,
  });

  const rows = useMemo<PriceRow[]>(() => {
    if (!pricing) return [];
    return pricing.rows.flatMap((item) => {
      const total2016 = asNumber(item.price_2016);
      const total2026 = asNumber(item.price_2026);
      const areaM2 = asNumber(item.area_m2);
      if (total2016 <= 0 || total2026 <= 0 || areaM2 <= 0) return [];
      const rate2016 = total2016 / areaM2;
      const rate2026 = total2026 / areaM2;
      return [
        {
          id: cleanText(item.id),
          use: cleanText(item.use),
          areaM2,
          total2016,
          total2026,
          rate2016,
          rate2026,
          difference: total2026 - total2016,
          growth: ((rate2026 - rate2016) / rate2016) * 100,
        },
      ];
    });
  }, [pricing]);

  const allGroups = useMemo(() => groupPrices(rows), [rows]);
  const filteredRows = useMemo(
    () => (selectedUse ? rows.filter((row) => row.use === selectedUse) : rows),
    [rows, selectedUse],
  );
  const stats = useMemo(() => summarize(filteredRows), [filteredRows]);
  const overallStats = useMemo(() => summarize(rows), [rows]);
  const groups = useMemo(() => groupPrices(filteredRows), [filteredRows]);
  const bands = useMemo(() => makeBands(filteredRows), [filteredRows]);
  const categoryStats = useMemo(
    () =>
      Object.fromEntries(
        PRICE_CATEGORIES.map((category) => [
          category.key,
          summarize(rows.filter((row) => priceCategory(row.use) === category.key)),
        ]),
      ) as Record<PriceCategoryKey, PriceStats>,
    [rows],
  );
  const categoryGrowthGroups = useMemo<PriceGroup[]>(
    () =>
      PRICE_CATEGORIES.map((category) => {
        const categorySummary = summarize(
          filteredRows.filter((row) => priceCategory(row.use) === category.key),
        );
        return {
          name: lang === "ar" ? category.labelAr : category.labelEn,
          count: categorySummary.count,
          rate2016: +categorySummary.averageRate2016.toFixed(0),
          rate2026: +categorySummary.averageRate2026.toFixed(0),
          growth: +categorySummary.growth.toFixed(1),
          color: category.color,
        };
      }),
    [filteredRows, lang],
  );
  const businessTotal2026 = overallStats.total2026;
  const otherRowsCount = useMemo(() => rows.filter((row) => priceCategory(row.use) === "other").length, [rows]);
  const coverage = pricing?.total_features ? (rows.length / pricing.total_features) * 100 : 0;
  const highestGrowth = [...allGroups]
    .filter((group) => group.count >= 5)
    .sort((a, b) => b.growth - a.growth)[0];

  const metrics = useMemo<Metric[]>(
    () => [
      {
        label: lang === "ar" ? "أقل سعر متر 2016" : "Lowest 2016 unit price",
        value: stats.minRate2016,
        unit: lang === "ar" ? "جنيه/م²" : "EGP/m²",
        tone: "water",
      },
      {
        label: lang === "ar" ? "أعلى سعر متر 2016" : "Highest 2016 unit price",
        value: stats.maxRate2016,
        unit: lang === "ar" ? "جنيه/م²" : "EGP/m²",
        tone: "brand",
      },
      {
        label: lang === "ar" ? "أقل سعر متر 2026" : "Lowest 2026 unit price",
        value: stats.minRate2026,
        unit: lang === "ar" ? "جنيه/م²" : "EGP/m²",
        tone: "agri",
      },
      {
        label: lang === "ar" ? "أعلى سعر متر 2026" : "Highest 2026 unit price",
        value: stats.maxRate2026,
        unit: lang === "ar" ? "جنيه/م²" : "EGP/m²",
        tone: "industrial",
      },
      {
        label: lang === "ar" ? "إجمالي المساحة المسعّرة" : "Priced area",
        value: stats.areaM2 / 1_000_000,
        unit: t.stats.km2,
        tone: "urban",
      },
      {
        label: lang === "ar" ? "قطع ارتفع سعرها" : "Parcels with increases",
        value: stats.increased,
        hint: `${((stats.increased / Math.max(stats.count, 1)) * 100).toFixed(1)}%`,
        tone: "accent",
      },
    ],
    [lang, stats, t.stats.km2],
  );

  const mapFilter = useMemo(
    () => (key: string, props: Record<string, unknown>) => {
      if (key !== "Land_Cover2026") return true;
      const hasPrice =
        asNumber(props[FIELDS.landPrice2016]) > 0 && asNumber(props[FIELDS.landPrice2026]) > 0;
      return hasPrice && (!selectedUse || cleanText(props[FIELDS.useDesc]) === selectedUse);
    },
    [selectedUse],
  );

  return (
    <div className="shrink-0">
      <TopBar
        title={lang === "ar" ? "لوحة أسعار الأراضي" : "Land Price Dashboard"}
        subtitle={
          lang === "ar"
            ? "مقارنة تفصيلية لقيمة الأرض وسعر المتر بين 2016 و2026"
            : "Detailed parcel-value and unit-price comparison between 2016 and 2026"
        }
      />

      <section className="mb-2 rounded-xl border border-border bg-card/35 p-2.5">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-2 border-b border-border pb-2">
          <div>
            <h2 className="text-sm font-extrabold text-foreground">
              {lang === "ar" ? "الملخص التنفيذي للأسعار والمساحات" : "Executive price and area summary"}
            </h2>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {lang === "ar" ? "مقارنة مباشرة مناسبة لاتخاذ القرار بين بيانات 2016 و2026" : "Decision-ready comparison of 2016 and 2026 data"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {otherRowsCount > 0 && (
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                {lang === "ar"
                  ? `${formatNum(otherRowsCount, lang, 0)} قطعة خارج الفئات الثلاث`
                  : `${formatNum(otherRowsCount, lang, 0)} parcels outside the three categories`}
              </span>
            )}
            <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              {lang === "ar" ? `${formatNum(rows.length, lang, 0)} قطعة مسعّرة` : `${formatNum(rows.length, lang, 0)} priced parcels`}
            </span>
          </div>
        </div>

        <div className="mb-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <BusinessAreaMetric
            label={lang === "ar" ? "مساحة منطقة الدراسة" : "Study area"}
            value={summary?.totals.study_area_km2 ?? 0}
            unit={lang === "ar" ? "كم²" : "km²"}
            tone="#0b5ea8"
            lang={lang}
          />
          <BusinessAreaMetric
            label={lang === "ar" ? "طول محور الدراسة" : "Study-axis length"}
            value={summary?.totals.axis_length_km ?? 0}
            unit={lang === "ar" ? "كم" : "km"}
            tone="#287fbd"
            lang={lang}
          />
          <BusinessAreaMetric
            label={lang === "ar" ? "إجمالي مساحة أراضي المباني" : "Total building-land area"}
            value={categoryStats.buildings.areaM2 / 1_000_000}
            unit={lang === "ar" ? "كم²" : "km²"}
            tone={CATEGORY_COLORS.buildings}
            lang={lang}
          />
          <BusinessAreaMetric
            label={lang === "ar" ? "إجمالي مساحة الأراضي الصناعية" : "Total industrial-land area"}
            value={categoryStats.industrial.areaM2 / 1_000_000}
            unit={lang === "ar" ? "كم²" : "km²"}
            tone={CATEGORY_COLORS.industrial}
            lang={lang}
          />
          <BusinessAreaMetric
            label={lang === "ar" ? "إجمالي مساحة الأراضي الزراعية" : "Total agricultural-land area"}
            value={categoryStats.agricultural.areaM2 / 4_200.83}
            unit={lang === "ar" ? "فدان" : "feddan"}
            tone={CATEGORY_COLORS.agricultural}
            lang={lang}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-3">
          <BusinessPriceCard label={lang === "ar" ? "أراضي المباني" : "Building land"} stats={categoryStats.buildings} color={CATEGORY_COLORS.buildings} grandTotal2026={businessTotal2026} lang={lang} />
          <BusinessPriceCard label={lang === "ar" ? "الأراضي الصناعية" : "Industrial land"} stats={categoryStats.industrial} color={CATEGORY_COLORS.industrial} grandTotal2026={businessTotal2026} lang={lang} />
          <BusinessPriceCard label={lang === "ar" ? "الأراضي الزراعية" : "Agricultural land"} stats={categoryStats.agricultural} color={CATEGORY_COLORS.agricultural} grandTotal2026={businessTotal2026} lang={lang} />
        </div>
      </section>

      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={lang === "ar" ? "القطع المسعّرة" : "Priced parcels"}
          value={stats.count}
          accent="brand"
          icon={<Database className="h-5 w-5" />}
          hint={`${coverage.toFixed(1)}% ${lang === "ar" ? "من بيانات 2026" : "of 2026 data"}`}
        />
        <StatCard
          label={lang === "ar" ? "وسيط سعر المتر 2016" : "Median unit price 2016"}
          value={stats.medianRate2016}
          unit={lang === "ar" ? "جنيه/م²" : "EGP/m²"}
          accent="water"
          icon={<Banknote className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ar" ? "وسيط سعر المتر 2026" : "Median unit price 2026"}
          value={stats.medianRate2026}
          unit={lang === "ar" ? "جنيه/م²" : "EGP/m²"}
          accent="accent"
          icon={<Banknote className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ar" ? "زيادة السعر الموزون" : "Weighted price growth"}
          value={`${stats.growth >= 0 ? "+" : ""}${stats.growth.toFixed(1)}`}
          unit="%"
          accent="agri"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ar" ? "إجمالي قيمة 2026" : "Total 2026 value"}
          value={stats.total2026 / 1_000_000_000_000}
          unit={lang === "ar" ? "تريليون جنيه" : "tn EGP"}
          accent="industrial"
          icon={<Calculator className="h-5 w-5" />}
        />
        <StatCard
          label={lang === "ar" ? "التغطية السعرية" : "Price coverage"}
          value={coverage.toFixed(1)}
          unit="%"
          accent="urban"
          icon={<MapIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mb-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <DeltaStatCard
          label={lang === "ar" ? "متوسط سعر المتر الموزون" : "Weighted unit price"}
          v2016={stats.averageRate2016}
          v2026={stats.averageRate2026}
          unit={lang === "ar" ? "جنيه/م²" : "EGP/m²"}
          accent="brand"
          icon={<Banknote className="h-4 w-4" />}
        />
        <DeltaStatCard
          label={lang === "ar" ? "وسيط سعر المتر" : "Median unit price"}
          v2016={stats.medianRate2016}
          v2026={stats.medianRate2026}
          unit={lang === "ar" ? "جنيه/م²" : "EGP/m²"}
          accent="accent"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <DeltaStatCard
          label={lang === "ar" ? "متوسط قيمة القطعة (مليون)" : "Average parcel value (million)"}
          v2016={stats.averageTotal2016 / 1_000_000}
          v2026={stats.averageTotal2026 / 1_000_000}
          unit={lang === "ar" ? "مليون جنيه" : "m EGP"}
          accent="industrial"
          icon={<Calculator className="h-4 w-4" />}
        />
        <DeltaStatCard
          label={lang === "ar" ? "إجمالي قيمة الأراضي" : "Total land value"}
          v2016={stats.total2016 / 1_000_000_000_000}
          v2026={stats.total2026 / 1_000_000_000_000}
          unit={lang === "ar" ? "تريليون جنيه" : "tn EGP"}
          accent="agri"
          icon={<Banknote className="h-4 w-4" />}
        />
      </div>

      <Panel
        title={lang === "ar" ? "تفاصيل الأسعار حسب النشاط" : "Price details by activity"}
        right={
          <span className="text-[10px] text-muted-foreground">
            {lang === "ar"
              ? "حساب مباشر من بيانات الأراضي"
              : "Calculated directly from land records"}
          </span>
        }
        className="mb-2"
      >
        <div className="grid gap-2 lg:grid-cols-3">
          {PRICE_CATEGORIES.map((category) => (
            <CategoryPriceCard
              key={category.key}
              category={category}
              stats={categoryStats[category.key]}
              lang={lang}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title={lang === "ar" ? "تصفية حسب استخدام الأرض" : "Filter by land use"}
        className="mb-2"
      >
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedUse(null)}
            className={`rounded-md border px-2.5 py-1 text-[11px] ${!selectedUse ? "border-[var(--brand)] bg-[var(--brand)]/15 text-foreground" : "border-border text-muted-foreground"}`}
          >
            {lang === "ar" ? "كل الاستخدامات" : "All uses"} · {rows.length}
          </button>
          {allGroups.slice(0, 12).map((group) => (
            <button
              key={group.name}
              type="button"
              onClick={() => setSelectedUse(selectedUse === group.name ? null : group.name)}
              className={`rounded-md border px-2.5 py-1 text-[11px] ${selectedUse === group.name ? "border-[var(--brand)] bg-[var(--brand)]/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {group.name} · {group.count}
            </button>
          ))}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
        <Panel
          title={lang === "ar" ? "الخريطة الحرارية للأسعار" : "Price heatmap"}
          right={
            <div className="flex gap-1">
              {(["price2016", "price2026", "priceGrowth"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setMapMode(mode)}
                  className={`rounded border px-2 py-1 text-[10px] ${mapMode === mode ? "border-[var(--brand)] bg-[var(--brand)]/15 text-foreground" : "border-border text-muted-foreground"}`}
                >
                  {mode === "price2016"
                    ? "2016"
                    : mode === "price2026"
                      ? "2026"
                      : lang === "ar"
                        ? "نسبة الزيادة"
                        : "Growth"}
                </button>
              ))}
            </div>
          }
          className="!p-2"
        >
          <MapViewClient
            height="clamp(320px, 58dvh, 620px)"
            layers={[
              {
                key: "Study_Area_Sector",
                label: t.layers.study_area,
                type: "boundary",
                fixedColor: "#0b5ea8",
                weight: 3,
              },
              {
                key: "Axis_Road_Sector",
                label: t.layers.axis,
                type: "line",
                fixedColor: "#38a8df",
                weight: 4,
              },
              {
                key: "Land_Cover2026",
                label: lang === "ar" ? "أسعار الأراضي" : "Land prices",
                type: "polygon",
                styleBy: "fixed",
                fixedColor: "#38a8df",
                weight: 0.35,
                fillOpacity: 0.3,
                interactive: true,
              },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2026"]}
            filterFn={mapFilter}
            styleChangeKey={mapMode}
          />
        </Panel>

        <div className="flex min-w-0 flex-col gap-2">
          <Panel title={lang === "ar" ? "المقارنة حسب نوع الاستخدام" : "Comparison by land use"}>
            <PriceComparisonChart data={groups} height={330} />
          </Panel>
          <Panel title={lang === "ar" ? "مضاعف سعر المتر حسب نوع الاستخدام" : "Unit-price multiplier by land use"}>
            <PriceGrowthChart data={categoryGrowthGroups} height={280} />
          </Panel>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title={lang === "ar" ? "توزيع القطع على شرائح سعر المتر" : "Unit-price band distribution"}
        >
          <PriceBandChart data={bands} />
        </Panel>
        <Panel
          title={lang === "ar" ? "مدى الأسعار وجودة التغطية" : "Price range and coverage quality"}
        >
          <MetricStrip metrics={metrics} compact />
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 md:grid-cols-3">
        <InsightCard
          tone="positive"
          title={lang === "ar" ? "اتجاه صاعد واسع" : "Broad upward trend"}
          body={
            lang === "ar"
              ? "يقيس المؤشر عدد القطع التي أصبحت قيمتها في 2026 أعلى من قيمتها في 2016 ضمن النطاق المحدد."
              : "This measures parcels whose recorded 2026 value exceeds their 2016 value in the selected scope."
          }
          metric={`${stats.increased}/${stats.count}`}
        />
        <InsightCard
          tone="info"
          title={lang === "ar" ? "أعلى نمو حسب الاستخدام" : "Highest growth by use"}
          body={highestGrowth?.name ?? (lang === "ar" ? "غير متاح" : "Unavailable")}
          metric={highestGrowth ? `+${highestGrowth.growth.toFixed(1)}%` : "—"}
        />
        <InsightCard
          tone="warning"
          title={lang === "ar" ? "قراءة صحيحة للمؤشر" : "How to read the metric"}
          body={
            lang === "ar"
              ? "المتوسط الموزون أنسب للمقارنة الإجمالية، بينما الوسيط يقلل تأثير القطع شديدة الارتفاع."
              : "The weighted average is best for totals, while the median limits the influence of extreme parcels."
          }
          metric={`${formatNum(stats.medianRate2026, lang, 0)} ${lang === "ar" ? "جنيه/م²" : "EGP/m²"}`}
        />
      </div>

      <div className="mt-2">
        <Panel
          title={lang === "ar" ? "جدول الأسعار التفصيلي لكل قطعة" : "Detailed parcel price table"}
        >
          <PriceTable rows={filteredRows} />
        </Panel>
      </div>
    </div>
  );
}

function PriceTable({ rows }: { rows: PriceRow[] }) {
  const { lang } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] =
    useState<keyof Pick<PriceRow, "rate2026" | "growth" | "difference" | "areaM2">>("rate2026");
  const view = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return [...rows]
      .filter(
        (row) =>
          !q || row.use.toLocaleLowerCase().includes(q) || row.id.toLocaleLowerCase().includes(q),
      )
      .sort((a, b) => b[sort] - a[sort])
      .slice(0, 150);
  }, [query, rows, sort]);
  const nextSort = () => {
    const keys = ["rate2026", "growth", "difference", "areaM2"] as const;
    setSort(keys[(keys.indexOf(sort) + 1) % keys.length]);
  };
  const sortLabel = {
    rate2026: lang === "ar" ? "سعر 2026" : "2026 price",
    growth: lang === "ar" ? "نسبة الزيادة" : "Growth",
    difference: lang === "ar" ? "فرق القيمة" : "Value difference",
    areaM2: lang === "ar" ? "المساحة" : "Area",
  }[sort];

  return (
    <div className="flex min-h-[390px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="glass flex min-w-0 basis-[240px] flex-1 items-center gap-2 rounded-md border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              lang === "ar"
                ? "بحث بنوع الاستخدام أو رقم القطعة..."
                : "Search by use or parcel ID..."
            }
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          onClick={nextSort}
          className="glass inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs"
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {sortLabel}
        </button>
        <span className="text-[10px] text-muted-foreground">
          {lang === "ar"
            ? `عرض ${view.length} من ${rows.length}`
            : `Showing ${view.length} of ${rows.length}`}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full min-w-[1120px] text-[10px]">
          <thead className="sticky top-0 z-10 border-b bg-card text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-start">{lang === "ar" ? "الاستخدام" : "Use"}</th>
              <th className="px-2 py-2 text-end">{lang === "ar" ? "المساحة م²" : "Area m²"}</th>
              <th className="px-2 py-2 text-end">{lang === "ar" ? "قيمة 2016" : "2016 value"}</th>
              <th className="px-2 py-2 text-end">{lang === "ar" ? "قيمة 2026" : "2026 value"}</th>
              <th className="px-2 py-2 text-end">
                {lang === "ar" ? "سعر المتر 2016" : "2016 / m²"}
              </th>
              <th className="px-2 py-2 text-end">
                {lang === "ar" ? "سعر المتر 2026" : "2026 / m²"}
              </th>
              <th className="px-2 py-2 text-end">{lang === "ar" ? "فرق القيمة" : "Difference"}</th>
              <th className="px-2 py-2 text-end">{lang === "ar" ? "نسبة الزيادة" : "Growth"}</th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr
                key={row.id}
                className="border-t text-foreground/90 hover:bg-[var(--surface-hover)]"
              >
                <td className="max-w-[220px] truncate px-2 py-1.5 font-semibold">{row.use}</td>
                <td className="px-2 py-1.5 text-end" dir="ltr">
                  {formatNum(row.areaM2, lang, 0)}
                </td>
                <td className="px-2 py-1.5 text-end" dir="ltr">
                  {formatNum(row.total2016, lang, 0)}
                </td>
                <td className="px-2 py-1.5 text-end font-semibold" dir="ltr">
                  {formatNum(row.total2026, lang, 0)}
                </td>
                <td className="px-2 py-1.5 text-end" dir="ltr">
                  {formatNum(row.rate2016, lang, 0)}
                </td>
                <td className="px-2 py-1.5 text-end font-semibold text-amber-400" dir="ltr">
                  {formatNum(row.rate2026, lang, 0)}
                </td>
                <td className="px-2 py-1.5 text-end text-emerald-400" dir="ltr">
                  +{formatNum(row.difference, lang, 0)}
                </td>
                <td
                  className={`px-2 py-1.5 text-end font-bold ${row.growth >= 0 ? "text-emerald-400" : "text-red-400"}`}
                  dir="ltr"
                >
                  {row.growth >= 0 ? "+" : ""}
                  {formatNum(row.growth, lang, 1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
