import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, Factory, Sprout } from "lucide-react";
import { loadPricingData } from "@/lib/data";
import { asNumber, cleanText, FIELDS } from "@/lib/analytics";
import { pricingDomain, summarizeUnitPrices, unitPriceRows, type PricingDomain, type UnitPriceStats } from "@/lib/pricing";
import { formatNum, useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { priceLegendItems } from "@/components/MapView";
import { PriceGrowthChart, type PriceGroup } from "@/components/PriceCharts";

export const Route = createFileRoute("/prices")({
  head: () => ({
    meta: [
      { title: "تحليل أسعار الأراضي 2016–2026 | طريق القاهرة–الإسماعيلية" },
      { name: "description", content: "مقارنة مبسطة لسعر متر الأرض حسب الاستخدام بين 2016 و2026." },
      { property: "og:title", content: "تحليل أسعار الأراضي 2016–2026 | طريق القاهرة–الإسماعيلية" },
      { property: "og:description", content: "خريطة ومقارنة مبسطة لأسعار الأراضي حسب التصنيف." },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/prices" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/prices" }],
  }),
  component: PricesPage,
});

type CategoryFilter = PricingDomain | "all";

const categoryCards = [
  { key: "urban" as const, ar: "الأراضي العمرانية", en: "Urban land", color: "#f97316", Icon: Building2 },
  { key: "agri" as const, ar: "الأراضي الزراعية", en: "Agricultural land", color: "#22c55e", Icon: Sprout },
  { key: "industrial" as const, ar: "الأراضي الصناعية", en: "Industrial land", color: "#a855f7", Icon: Factory },
];

function compactMoney(value: number, lang: "ar" | "en") {
  if (Math.abs(value) >= 1_000_000_000_000) return `${formatNum(value / 1_000_000_000_000, lang, 2)} ${lang === "ar" ? "تريليون" : "tn"}`;
  if (Math.abs(value) >= 1_000_000_000) return `${formatNum(value / 1_000_000_000, lang, 2)} ${lang === "ar" ? "مليار" : "bn"}`;
  if (Math.abs(value) >= 1_000_000) return `${formatNum(value / 1_000_000, lang, 2)} ${lang === "ar" ? "مليون" : "m"}`;
  return formatNum(value, lang, 0);
}

function CategoryOverviewCard({ item, stats, lang, active, onClick }: {
  item: (typeof categoryCards)[number];
  stats: UnitPriceStats;
  lang: "ar" | "en";
  active: boolean;
  onClick: () => void;
}) {
  const { Icon } = item;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[310px] min-w-0 flex-col items-center justify-center bg-card px-5 py-7 text-center transition-colors hover:bg-muted/35 sm:px-7 sm:py-8 ${active ? "z-10 ring-2 ring-inset" : ""}`}
      style={{ "--tw-ring-color": item.color } as React.CSSProperties}
    >
      <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: item.color }} />
      <div className="flex w-full flex-col items-center justify-center">
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl" style={{ color: item.color, backgroundColor: `${item.color}1f` }}><Icon className="h-7 w-7" /></span>
        <h3 className="text-xl font-black leading-snug text-foreground sm:text-2xl">{lang === "ar" ? item.ar : item.en}</h3>
      </div>
      <div className="mt-7 grid w-full grid-cols-2 place-items-center gap-x-6 gap-y-7">
        <div className="min-w-0 text-center"><p className="text-sm font-bold text-muted-foreground sm:text-base">{lang === "ar" ? "سعر المتر 2026" : "2026 price / m²"}</p><strong className="mt-2 block text-3xl font-black leading-none tabular-nums sm:text-4xl" style={{ color: item.color }}>{formatNum(stats.averageRate2026, lang, 0)}</strong></div>
        <div className="min-w-0 text-center"><p className="text-sm font-bold text-muted-foreground sm:text-base">{lang === "ar" ? "سعر المتر 2016" : "2016 price / m²"}</p><strong className="mt-2 block text-3xl font-black leading-none text-foreground tabular-nums sm:text-4xl">{formatNum(stats.averageRate2016, lang, 0)}</strong></div>
        <div className="min-w-0 text-center"><p className="text-sm font-bold text-muted-foreground sm:text-base">{lang === "ar" ? "إجمالي قيمة 2026" : "Total value 2026"}</p><strong className="mt-2 block break-words text-xl font-black leading-snug text-foreground tabular-nums sm:text-2xl">{compactMoney(stats.total2026, lang)} <small className="text-sm font-extrabold sm:text-base">{lang === "ar" ? "جنيه" : "EGP"}</small></strong></div>
        <div className="min-w-0 text-center"><p className="text-sm font-bold text-muted-foreground sm:text-base">{lang === "ar" ? "نسبة الزيادة" : "Growth"}</p><strong className="mt-2 block text-2xl font-black leading-none tabular-nums sm:text-3xl" style={{ color: item.color }}>{stats.growth >= 0 ? "+" : ""}{formatNum(stats.growth, lang, 1)}%</strong></div>
      </div>
    </button>
  );
}

function PricesPage() {
  const { t, lang } = useI18n();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [mapMode, setMapMode] = useState<"price2016" | "price2026" | "priceGrowth">("price2026");
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: loadPricingData });

  const rows = useMemo(() => unitPriceRows(data?.rows), [data]);
  const categoryRows = useMemo(
    () => category === "all" ? rows : rows.filter((row) => pricingDomain(row.use, row.landUseCode) === category),
    [category, rows],
  );
  const overviewHeight = 560;
  const priceLegend = useMemo(() => priceLegendItems(mapMode, lang), [mapMode, lang]);
  const categoryStats = useMemo(
    () => Object.fromEntries(categoryCards.map((item) => [item.key, summarizeUnitPrices(rows.filter((row) => pricingDomain(row.use, row.landUseCode) === item.key))])) as Record<PricingDomain, UnitPriceStats>,
    [rows],
  );
  const growthGroups = useMemo<PriceGroup[]>(
    () => categoryCards.map((item) => ({
      name: lang === "ar" ? item.ar : item.en,
      count: categoryStats[item.key].count,
      rate2016: Math.round(categoryStats[item.key].averageRate2016),
      rate2026: Math.round(categoryStats[item.key].averageRate2026),
      growth: +categoryStats[item.key].growth.toFixed(1),
      color: item.color,
    })),
    [categoryStats, lang],
  );
  const mapFilter = useMemo(
    () => (key: string, props: Record<string, unknown>) => {
      if (key !== "Land_Cover2026") return true;
      const use = cleanText(props[FIELDS.useDesc]);
      const hasPrice = asNumber(props[FIELDS.landPrice2016]) > 0 && asNumber(props[FIELDS.landPrice2026]) > 0;
      const matchesCategory = category === "all" || pricingDomain(use, asNumber(props[FIELDS.useCode])) === category;
      return hasPrice && matchesCategory;
    },
    [category],
  );

  const changeCategory = (next: CategoryFilter) => {
    setCategory(next);
  };

  return (
    <div className="shrink-0">
      <TopBar title={lang === "ar" ? "أسعار الأراضي" : "Land Prices"} subtitle={lang === "ar" ? " " : "Choose a classification and view unit prices on the map"} />

      <section className="mb-2 overflow-hidden rounded-xl border border-border bg-border">
        <div className="grid gap-px md:grid-cols-2 xl:grid-cols-3">
          {categoryCards.map((item) => (
            <CategoryOverviewCard
              key={item.key}
              item={item}
              stats={categoryStats[item.key]}
              lang={lang}
              active={category === item.key}
              onClick={() => changeCategory(category === item.key ? "all" : item.key)}
            />
          ))}
        </div>
      </section>

      <div>
        <Panel
          title={lang === "ar" ? "خريطة سعر المتر" : "Unit-price map"}
          right={<div className="flex gap-1">{(["price2016", "price2026", "priceGrowth"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setMapMode(mode)} className={`rounded border px-2 py-1 text-[10px] ${mapMode === mode ? "border-[var(--brand)] bg-[var(--brand)]/15 font-bold text-foreground" : "border-border text-muted-foreground"}`}>
              {mode === "price2016" ? "2016" : mode === "price2026" ? "2026" : lang === "ar" ? "الزيادة" : "Growth"}
            </button>
          ))}</div>}
          className="dashboard-map-sticky h-full !p-2"
        >
          <MapViewClient
            height={`${overviewHeight}px`}
            showLegend
            defaultLegendOpen
            defaultLayerControlOpen={false}
            legendType="gradient"
            legendTitle={mapMode === "priceGrowth" ? (lang === "ar" ? "نسبة الزيادة" : "Growth") : (lang === "ar" ? "سعر المتر" : "Unit price")}
            legendHint={lang === "ar" ? "أربع فئات لقراءة الخريطة بسرعة" : "Four classes for quick map reading"}
            legendItems={priceLegend}
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: "#073b88", fillColor: "#ffe7a3", weight: 3, dashArray: "8 6", fillOpacity: 0.16 },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: "#e31a1c", weight: 3 },
              { key: "Land_Cover2026", label: lang === "ar" ? "أسعار الأراضي" : "Land prices", type: "polygon", styleBy: mapMode, weight: 0.35, fillOpacity: 0.56, smoothFactor: 0.15, interactive: true },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2026"]}
            filterFn={mapFilter}
            styleChangeKey={`${mapMode}-${category}`}
          />
        </Panel>
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "نمو سعر المتر حسب نوع الأرض" : "Unit-price growth by land type"}>
          <p className="mb-2 text-center text-sm font-bold text-muted-foreground sm:text-base">
            {lang === "ar"
              ? "نسبة زيادة متوسط سعر المتر من 2016 إلى 2026 — العمود الأعلى يعني زيادة أكبر."
              : "Average unit-price increase from 2016 to 2026 — a taller bar means higher growth."}
          </p>
          <PriceGrowthChart data={growthGroups} height={360} />
        </Panel>
      </div>
    </div>
  );
}
