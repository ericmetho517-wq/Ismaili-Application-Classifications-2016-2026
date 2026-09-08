import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, Factory, Sprout } from "lucide-react";
import { loadPricingData } from "@/lib/data";
import { asNumber, FIELDS } from "@/lib/analytics";
import { pricingDomain, unitPriceRows, summarizeUnitPrices, type PricingDomain, type UnitPriceStats } from "@/lib/pricing";
import { formatNum, useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { landUseLegendItems } from "@/components/MapView";

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

// Authoritative totals from الاسماعيلية (1).xlsx; non-priced uses stay map-only.
const workbookTotals: Record<"urban" | "agri" | "industrial", [number, number]> = {
  agri: [94777205283.4583, 456644273464.868],
  urban: [316606478701.806, 5683827610371.09],
  industrial: [35600984498.3984, 760199655768.47],
};

function money(value: number, lang: "ar" | "en") {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000_000) return `${formatNum(value / 1_000_000_000_000, lang, 2)} ${lang === "ar" ? "تريليون" : "tn"}`;
  if (absolute >= 1_000_000_000) return `${formatNum(value / 1_000_000_000, lang, 2)} ${lang === "ar" ? "مليار" : "bn"}`;
  if (absolute >= 1_000_000) return `${formatNum(value / 1_000_000, lang, 2)} ${lang === "ar" ? "مليون" : "m"}`;
  return `${formatNum(value, lang, 0)} ${lang === "ar" ? "جنيه" : "EGP"}`;
}

function CategoryValueCard({ item, stats, lang, active, onClick }: { item: (typeof categoryCards)[number]; stats: UnitPriceStats; lang: "ar" | "en"; active: boolean; onClick: () => void }) {
  const { Icon } = item;
  const difference = stats.total2026 - stats.total2016;
  return <button type="button" onClick={onClick} aria-pressed={active} className={`relative flex min-h-[160px] w-full flex-col items-center justify-center bg-black px-2.5 py-3 text-center text-white transition ${active ? "ring-2 ring-inset" : "hover:bg-white/5"}`} style={{ "--tw-ring-color": item.color } as React.CSSProperties}>
    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: item.color }} />
    <span className="mb-1 grid h-7 w-7 place-items-center rounded-md" style={{ color: item.color, backgroundColor: `${item.color}1f` }}><Icon className="h-3.5 w-3.5" /></span>
    <h3 className="text-sm font-black text-white sm:text-base">{lang === "ar" ? item.ar : item.en}</h3>
    <div className="mt-2.5 grid w-full grid-cols-2 gap-x-2 gap-y-2">
      <div className="border-e border-white/15 pe-3"><p className="text-sm font-extrabold text-white/80 sm:text-base">{lang === "ar" ? "إجمالي 2016" : "Total 2016"}</p><strong className="mt-2 block text-xl font-black leading-tight text-white sm:text-2xl">{money(stats.total2016, lang)}</strong></div>
      <div className="ps-3"><p className="text-sm font-extrabold text-white/80 sm:text-base">{lang === "ar" ? "إجمالي 2026" : "Total 2026"}</p><strong className="mt-2 block text-xl font-black leading-tight sm:text-2xl" style={{ color: item.color }}>{money(stats.total2026, lang)}</strong></div>
      <div className="col-span-2 border-t border-white/15 pt-3"><p className="text-sm font-extrabold text-white/80 sm:text-base">{lang === "ar" ? "الفرق بين السنتين" : "Difference between years"}</p><strong className="mt-1 block text-2xl font-black leading-tight text-emerald-400 sm:text-3xl">{difference >= 0 ? "+" : ""}{money(difference, lang)}</strong></div>
    </div>
  </button>;
}

function PricesPage() {
  const { t, lang } = useI18n();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const { data } = useQuery({ queryKey: ["pricing"], queryFn: loadPricingData });

  const rows = useMemo(() => unitPriceRows(data?.rows), [data]);
  const categoryStats = useMemo(() => Object.fromEntries(categoryCards.map((item) => {
    const [total2016, total2026] = workbookTotals[item.key];
    const base = summarizeUnitPrices(rows.filter((row) => pricingDomain(row.use, row.landUseCode) === item.key));
    return [item.key, { ...base, total2016, total2026 }];
  })) as Record<PricingDomain, UnitPriceStats>, [rows]);
  const overviewHeight = 560;
  const landUseLegend = useMemo(() => landUseLegendItems(lang), [lang]);
  const mapFilter = useMemo(() => (key: string, props: Record<string, unknown>) => {
    if (category === "all" || (key !== "Land_Cover2016" && key !== "Land_Cover2026")) return true;
    const domain = pricingDomain(String(props[FIELDS.useDesc] ?? ""), asNumber(props[FIELDS.useCode]));
    if (domain !== category) return false;
    const priceField = key === "Land_Cover2016" ? FIELDS.landPrice2016 : FIELDS.landPrice2026;
    return asNumber(props[priceField]) > 0;
  }, [category]);

  return (
    <div className="shrink-0">
      <TopBar title={lang === "ar" ? "أسعار الأراضي" : "Land Prices"} subtitle={lang === "ar" ? " " : "Choose a classification and view unit prices on the map"} />

      <section className="mb-2 overflow-hidden rounded-xl border border-border bg-border">
        <div className="grid gap-px md:grid-cols-3">{categoryCards.map((item) => <CategoryValueCard key={item.key} item={item} stats={categoryStats[item.key]} lang={lang} active={category === item.key} onClick={() => setCategory(category === item.key ? "all" : item.key)} />)}</div>
      </section>

      <div className="grid gap-2 md:grid-cols-2">
        <Panel
          title={lang === "ar" ? "خريطة استخدامات الأراضي — 2016" : "Land-use map — 2016"}
          right={null}
          className="dashboard-map-sticky h-full !p-2"
        >
          <MapViewClient
            height={`${overviewHeight}px`}
            initialBasemap="satellite"
            satelliteVintage="2016"
            syncGroup="prices-maps"
            transportVariant="roads"
            showLegend
            defaultLegendOpen
            defaultLayerControlOpen={false}
            legendType="list"
            legendTitle={lang === "ar" ? "استخدامات الأراضي" : "Land use"}
            legendHint={lang === "ar" ? "السيمبولوجي الموحد للخريطة" : "Unified map symbology"}
            legendItems={landUseLegend}
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: "#073b88", fillColor: "#ffe7a3", weight: 3, dashArray: "8 6", fillOpacity: 0.16 },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: "#e31a1c", weight: 3 },
              { key: "Land_Cover2016", label: lang === "ar" ? "استخدامات الأراضي 2016" : "Land use 2016", type: "polygon", styleBy: "use", weight: 0.35, fillOpacity: 0.78, smoothFactor: 0.15, interactive: true },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2016"]}
            filterFn={mapFilter}
            styleChangeKey={category}
          />
        </Panel>
        <Panel
          title={lang === "ar" ? "خريطة استخدامات الأراضي — 2026" : "Land-use map — 2026"}
          right={null}
          className="dashboard-map-sticky h-full !p-2"
        >
          <MapViewClient
            height={`${overviewHeight}px`}
            initialBasemap="satellite"
            syncGroup="prices-maps"
            transportVariant="all"
            showLegend
            defaultLegendOpen
            defaultLayerControlOpen={false}
            legendType="list"
            legendTitle={lang === "ar" ? "استخدامات الأراضي" : "Land use"}
            legendHint={lang === "ar" ? "السيمبولوجي الموحد للخريطة" : "Unified map symbology"}
            legendItems={landUseLegend}
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: "#073b88", fillColor: "#ffe7a3", weight: 3, dashArray: "8 6", fillOpacity: 0.16 },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: "#e31a1c", weight: 3 },
              { key: "Land_Cover2026", label: lang === "ar" ? "استخدامات الأراضي 2026" : "Land use 2026", type: "polygon", styleBy: "use", weight: 0.35, fillOpacity: 0.78, smoothFactor: 0.15, interactive: true },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2026", "Urban_Changes", "Agricultural_Changes", "Industrial_Changes"]}
            filterFn={mapFilter}
            styleChangeKey={category}
          />
        </Panel>
      </div>

    </div>
  );
}
