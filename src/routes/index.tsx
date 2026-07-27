import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { loadSummary, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { InsightCard } from "@/components/InsightCard";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import {
  HBarUsageChart,
  CompareYearsChart,
  DeltaBarChart,
  ChangeTable,
  ShareCompareChart,
  MoversBoard,
  RadarProfileChart,
  MultiRadialChart,
} from "@/components/Charts";
import { useUseLegend } from "@/components/Legend";
import { FilterChip, applyMapFilter, fieldFilter, landUseFilter, toggleFilter, type MapFilter } from "@/lib/mapFilters";
import {
  Building2,
  Sprout,
  Factory,
  Droplets,
  CheckCircle2,
  Layers,
  MapIcon,
  Route as RouteIcon,
  Repeat2,
  Maximize2,
  Minimize2,
  Mountain,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ismailia Geo Dashboard — Land Use & Urban Change Analytics 2016–2026" },
      { name: "description", content: "Interactive overview of Ismailia land use: KPI snapshot, live map, and 2016 vs 2026 comparison across urban, agricultural, industrial and water sectors." },
      { property: "og:title", content: "Ismailia Geo Dashboard — Overview" },
      { property: "og:description", content: "KPI snapshot and live map comparing 2016 vs 2026 land use across Ismailia's development axis." },
      { property: "og:url", content: "https://ismailia-insight-hub.lovable.app/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-insight-hub.lovable.app/" }],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const { t } = useI18n();
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const legend = useUseLegend();
  const [expanded, setExpanded] = useState(false);
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapFilter | null>(null);

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const USE_URBAN = "\u062d\u0636\u0631\u064a / \u0639\u0645\u0631\u0627\u0646\u064a";
  const USE_AGRI = "\u0632\u0631\u0627\u0639\u064a";
  const USE_INDUSTRIAL = "\u0635\u0646\u0627\u0639\u064a";
  const USE_WATER = "\u0645\u064a\u0627\u0647";
  const USE_VACANT = "\u0627\u0631\u0636 \u0641\u0636\u0627\u0621";
  const USE_MILITARY = "\u0645\u0646\u0637\u0642\u0629 \u0639\u0633\u0643\u0631\u064a\u0629";
  const CHANGE_STATUS_FIELD = "\u062d\u0627\u0644\u0629_\u0627\u0644\u062a\u063a\u064a\u0631";
  const total2026Count = b.reduce((sum, item) => sum + item.count, 0);
  const changed2026 = s?.change_status_2026.find((item) => String(item.name) === "1");
  const unchanged2026 = s?.change_status_2026.find((item) => String(item.name) === "2");
  const changedShare = total2026Count > 0 ? ((changed2026?.count ?? 0) / total2026Count) * 100 : 0;
  const selectLandUse = (label: string, rawName: string, layerKeys = ["Land_Cover2026"] as const) => {
    toggleFilter(
      selectedMapFilter,
      landUseFilter(label, [...layerKeys], rawName),
      setSelectedMapFilter,
    );
  };
  const selectChangeStatus = (label: string, value: "1" | "2") => {
    toggleFilter(
      selectedMapFilter,
      fieldFilter(label, "Land_Cover2026", CHANGE_STATUS_FIELD, value),
      setSelectedMapFilter,
    );
  };

  return (
    <>
      <TopBar />

      {/* KPI row — current snapshot */}
      <div className="mb-2 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label={t.stats.studyArea}
          value={s?.totals.study_area_km2 ?? 0}
          unit={t.stats.km2}
          icon={<MapIcon className="h-4 w-4" />}
          accent="brand"
        />
        <StatCard
          label={t.stats.axisLength}
          value={s?.totals.axis_length_km ?? 0}
          unit={t.stats.km}
          icon={<RouteIcon className="h-4 w-4" />}
          accent="accent"
        />
        <StatCard
          label={`إجمالي عناصر 2026`}
          value={total2026Count}
          icon={<Layers className="h-4 w-4" />}
          accent="urban"
          hint={`كل عناصر استخدامات الأرض - ${t.map.year2026}`}
        />
        <StatCard
          label="يوجد تغير"
          value={changed2026?.count ?? 0}
          icon={<Repeat2 className="h-4 w-4" />}
          accent="agri"
          hint={`${(changed2026?.area_km2 ?? 0).toFixed(2)} ${t.stats.km2} - ${changedShare.toFixed(1)}%`}
          selected={selectedMapFilter?.label === "يوجد تغير"}
          onClick={() => selectChangeStatus("يوجد تغير", "1")}
        />
        <StatCard
          label="لا يوجد تغير"
          value={unchanged2026?.count ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          accent="industrial"
          hint={`${(unchanged2026?.area_km2 ?? 0).toFixed(2)} ${t.stats.km2} - ${(100 - changedShare).toFixed(1)}%`}
          selected={selectedMapFilter?.label === "لا يوجد تغير"}
          onClick={() => selectChangeStatus("لا يوجد تغير", "2")}
        />
        <StatCard
          label="مساحة العناصر المتغيرة"
          value={changed2026?.area_km2 ?? 0}
          unit={t.stats.km2}
          icon={<Droplets className="h-4 w-4" />}
          accent="water"
          hint={`${changed2026?.count ?? 0} ${t.stats.featuresCount} - ${t.map.year2026}`}
          selected={selectedMapFilter?.label === "يوجد تغير"}
          onClick={() => selectChangeStatus("يوجد تغير", "1")}
        />
      </div>

      {/* Delta row — 2016 → 2026 comparison */}
      {s && (
        <div className="mb-2 grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          <DeltaStatCard
            label={t.stats.urbanArea}
            v2016={pickArea(a, USE_URBAN)}
            v2026={pickArea(b, USE_URBAN)}
            unit={t.stats.km2}
            accent="urban"
            icon={<Building2 className="h-3.5 w-3.5" />}
          />
          <DeltaStatCard
            label={t.stats.agriArea}
            v2016={pickArea(a, USE_AGRI)}
            v2026={pickArea(b, USE_AGRI)}
            unit={t.stats.km2}
            accent="agri"
            icon={<Sprout className="h-3.5 w-3.5" />}
          />
          <DeltaStatCard
            label={t.stats.industrialArea}
            v2016={pickArea(a, USE_INDUSTRIAL)}
            v2026={pickArea(b, USE_INDUSTRIAL)}
            unit={t.stats.km2}
            accent="industrial"
            icon={<Factory className="h-3.5 w-3.5" />}
          />
          <DeltaStatCard
            label="أرض فضاء / Vacant"
            v2016={pickArea(a, USE_VACANT)}
            v2026={pickArea(b, USE_VACANT)}
            unit={t.stats.km2}
            accent="brand"
            invert
            icon={<Mountain className="h-3.5 w-3.5" />}
          />
          <DeltaStatCard
            label={t.stats.waterArea}
            v2016={pickArea(a, USE_WATER)}
            v2026={pickArea(b, USE_WATER)}
            unit={t.stats.km2}
            accent="water"
            icon={<Droplets className="h-3.5 w-3.5" />}
          />
          <DeltaStatCard
            label="منطقة عسكرية / Military"
            v2016={pickArea(a, USE_MILITARY)}
            v2026={pickArea(b, USE_MILITARY)}
            unit={t.stats.km2}
            accent="accent"
            invert
            icon={<Shield className="h-3.5 w-3.5" />}
          />
        </div>
      )}

      {/* Main area: Map + vertical charts column */}
      <div
        className={`min-h-[70dvh] flex-none gap-2 sm:min-h-[64dvh] xl:min-h-[72dvh] ${
          expanded
            ? "flex flex-col"
            : "flex flex-col xl:grid xl:grid-cols-[minmax(0,1fr)_clamp(380px,27vw,520px)]"
        }`}
      >
        <Panel
          title={t.map.title}
          className={`!p-1.5 ${expanded ? "flex-1" : "min-h-[70dvh] sm:min-h-[64dvh] xl:h-[72dvh] xl:min-h-0"}`}
          right={
            <button
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Collapse map to default size" : "Expand map to full size"}
              aria-expanded={expanded}
              className="glass inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] text-foreground transition-colors hover:text-[var(--brand)]"
              title={t.map.fullScreen}
            >
              {expanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
              <span>{t.map.fullScreen}</span>
            </button>
          }
        >
          <FilterChip filter={selectedMapFilter} onClear={() => setSelectedMapFilter(null)} />
          <MapViewClient
            height="100%"
            showLegend
            defaultLayerControlOpen={false}
            legendItems={legend}
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: "#22d3ee" },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: "#f59e0b", weight: 4 },
              { key: "Land_Cover2026", label: t.layers.land_2026, type: "polygon", styleBy: "use" },
              { key: "Urban_Changes", label: t.layers.urban, type: "polygon", styleBy: "use", fixedColor: "#ef4444" },
              { key: "Agricultural_Changes", label: t.layers.agri, type: "polygon", fixedColor: "#22c55e" },
              { key: "Industrial_Changes", label: t.layers.industrial, type: "polygon", fixedColor: "#a855f7" },
              { key: "Water_Changes", label: t.layers.water, type: "polygon", fixedColor: "#3b82f6" },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2026"]}
            filterFn={applyMapFilter(selectedMapFilter)}
          />
        </Panel>

        {!expanded && (
          <aside
            aria-label={t.charts.landUse2026}
            className="flex min-h-0 flex-col gap-2 [&>section]:shrink-0 xl:h-[72dvh] xl:overflow-y-auto xl:overscroll-contain xl:pe-1"
          >
            <Panel title={t.charts.landUse2026} className="min-h-[280px] xl:min-h-[260px]">
              {s && <HBarUsageChart data={s.land_cover_2026} height={230} selectedName={selectedMapFilter?.layerKeys.includes("Land_Cover2026") ? undefined : null} onSelect={(item) => selectLandUse(item.label ?? item.name, item.name)} />}
            </Panel>
            <Panel title={t.charts.landUse2016} className="min-h-[280px] xl:min-h-[260px]">
              {s && <HBarUsageChart data={s.land_cover_2016} height={230} onSelect={(item) => selectLandUse(item.label ?? item.name, item.name, ["Land_Cover2016"])} />}
            </Panel>
            <Panel title={t.charts.deltaTitle} className="min-h-[300px] xl:min-h-[280px]">
              {s && <DeltaBarChart a={s.land_cover_2016} b={s.land_cover_2026} height={250} selectedName={selectedMapFilter?.label} onSelect={(item) => selectLandUse(item.label ?? item.name, item.name, ["Land_Cover2016", "Land_Cover2026"])} />}
            </Panel>
            <Panel title={t.charts.compareUse} className="min-h-[300px] xl:min-h-[280px]">
              {s && (
                <CompareYearsChart
                  a={s.land_cover_2016}
                  b={s.land_cover_2026}
                  labelA={t.map.year2016}
                  labelB={t.map.year2026}
                  height={250}
                  selectedName={selectedMapFilter?.label}
                  onSelect={(item) => selectLandUse(item.label ?? item.name, item.name, ["Land_Cover2016", "Land_Cover2026"])}
                />
              )}
            </Panel>
            <Panel title={t.charts.radar} className="min-h-[250px]">
              {s && <RadarProfileChart data={s.land_cover_2026} height={230} />}
            </Panel>
            <Panel title={t.charts.radial} className="min-h-[250px]">
              {s && <MultiRadialChart data={s.land_cover_2026} height={230} />}
            </Panel>
            <Panel title={t.charts.shareCompare} className="min-h-[260px] overflow-hidden">
              {s && <ShareCompareChart a={s.land_cover_2016} b={s.land_cover_2026} labelA={t.map.year2016} labelB={t.map.year2026} height={190} selectedName={selectedMapFilter?.label} onSelect={(item) => selectLandUse(item.name, item.name, ["Land_Cover2016", "Land_Cover2026"])} />}
            </Panel>
            <Panel title={t.charts.movers} className="min-h-[230px] overflow-hidden">
              {s && <MoversBoard a={s.land_cover_2016} b={s.land_cover_2026} />}
            </Panel>
            <Panel title={t.charts.changeTable} className="min-h-[300px]">
              {s && <ChangeTable a={s.land_cover_2016} b={s.land_cover_2026} labelA="2016" labelB="2026" />}
            </Panel>
          </aside>
        )}
      </div>

      {/* Insights row */}
      {!expanded && s && (
        <div className="mt-2 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <InsightCard
            tone="positive"
            title={t.insights.urbanBoomTitle}
            body={t.insights.urbanBoomBody}
            metric={`+${(((pickArea(b, "حضري / عمراني") - pickArea(a, "حضري / عمراني")) / Math.max(pickArea(a, "حضري / عمراني"), 0.01)) * 100).toFixed(0)}%`}
          />
          <InsightCard
            tone="positive"
            title={t.insights.agriExpandTitle}
            body={t.insights.agriExpandBody}
            metric={`+${(((pickArea(b, "زراعي") - pickArea(a, "زراعي")) / Math.max(pickArea(a, "زراعي"), 0.01)) * 100).toFixed(0)}%`}
          />
          <InsightCard
            tone="positive"
            title={t.insights.vacantDropTitle}
            body={t.insights.vacantDropBody}
            metric={`${(((pickArea(b, "ارض فضاء") - pickArea(a, "ارض فضاء")) / Math.max(pickArea(a, "ارض فضاء"), 0.01)) * 100).toFixed(0)}%`}
          />
          <InsightCard
            tone="warning"
            title={t.insights.waterRiskTitle}
            body={t.insights.waterRiskBody}
            metric={`${(((pickArea(b, "مياه") - pickArea(a, "مياه")) / Math.max(pickArea(a, "مياه"), 0.01)) * 100).toFixed(0)}%`}
          />
        </div>
      )}
    </>
  );
}
