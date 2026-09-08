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
  return <button type="button" onClick={onClick} aria-pressed={active} className={`relative flex min-h-[132px] w-full flex-col items-center justify-center bg-white px-2 py-2 text-center text-foreground transition dark:bg-black dark:text-white ${active ? "ring-2 ring-inset" : "hover:bg-muted/30 dark:hover:bg-white/5"}`} style={{ "--tw-ring-color": item.color } as React.CSSProperties}>
    <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: item.color }} />
    <span className="mb-0.5 grid h-6 w-6 place-items-center rounded-md" style={{ color: item.color, backgroundColor: `${item.color}1f` }}><Icon className="h-3 w-3" /></span>
    <h3 className="text-xs font-black text-foreground dark:text-white sm:text-sm">{lang === "ar" ? item.ar : item.en}</h3>
    <div className="mt-1.5 grid w-full grid-cols-2 gap-x-2 gap-y-1">
      <div className="border-e border-border pe-2"><p className="text-xs font-extrabold text-muted-foreground sm:text-sm">{lang === "ar" ? "إجمالي 2016" : "Total 2016"}</p><strong className="mt-1 block text-lg font-black leading-tight text-foreground dark:text-white sm:text-xl">{money(stats.total2016, lang)}</strong></div>
      <div className="ps-2"><p className="text-xs font-extrabold text-muted-foreground sm:text-sm">{lang === "ar" ? "إجمالي 2026" : "Total 2026"}</p><strong className="mt-1 block text-lg font-black leading-tight sm:text-xl" style={{ color: item.color }}>{money(stats.total2026, lang)}</strong></div>
      <div className="col-span-2 border-t border-border pt-2"><p className="text-xs font-extrabold text-muted-foreground sm:text-sm">{lang === "ar" ? "الفرق بين السنتين" : "Difference between years"}</p><strong className="mt-0.5 block text-xl font-black leading-tight text-emerald-400 sm:text-2xl">{difference >= 0 ? "+" : ""}{money(difference, lang)}</strong></div>
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
    if (category === "all") return true;
    if (["Urban_Changes", "Agricultural_Changes", "Industrial_Changes", "Water_Changes"].includes(key)) return false;
    if (key !== "Land_Cover2016" && key !== "Land_Cover2026") return true;
    const useDesc = props[FIELDS.useDesc] ?? props["\u0648\u0635\u0641_\u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645"] ?? "";
    const useCode = props[FIELDS.useCode] ?? props["\u0627\u0633\u062a\u062e\u062f\u0627\u0645_\u0627\u0644\u0623\u0631\u0636"];
    const description = String(useDesc);
    const code = asNumber(useCode);
    const domain: PricingDomain | "other" = code === 3
      ? "urban"
      : code === 1
        ? "industrial"
        : /زراعي|مزارع|صوب|محاصيل|حيواني/.test(description)
          ? "agri"
          : pricingDomain(description, code);
    if (domain !== category) return false;
    // The 2016 geometry is a historical layer without price attributes; its
    // priced membership is represented by the matching priced category.
    if (key === "Land_Cover2016") return true;
    const price2026 = asNumber(props[FIELDS.landPrice2026] ?? props["\u0633\u0639\u0631_\u0627\u0644\u0623\u0631\u0636_2026"]);
    return price2026 > 0;
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
            key={`prices-2016-${category}`}
            height={`${overviewHeight}px`}
            initialBasemap="satellite"
            satelliteVintage="2016"
            syncGroup="prices-maps"
            transportVariant="roads"
            showLegend
            defaultLegendOpen={false}
            defaultLayerControlOpen={false}
            legendType="list"
            legendTitle={lang === "ar" ? "استخدامات الأراضي" : "Land use"}
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
            key={`prices-2026-${category}`}
            height={`${overviewHeight}px`}
            initialBasemap="satellite"
            syncGroup="prices-maps"
            transportVariant="all"
            showLegend
            defaultLegendOpen={false}
            defaultLayerControlOpen={false}
            legendType="list"
            legendTitle={lang === "ar" ? "استخدامات الأراضي" : "Land use"}
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
