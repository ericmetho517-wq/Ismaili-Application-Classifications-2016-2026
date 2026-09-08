import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { loadSummary, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { InsightCard } from "@/components/InsightCard";
import { MapViewClient } from "@/components/MapViewClient";
import {
  CompareYearsChart,
  DeltaBarChart,
  ChangeTable,
  ShareCompareChart,
  MoversBoard,
  RadarProfileChart,
} from "@/components/Charts";
import { useUseLegend } from "@/components/Legend";
import { Building2, Sprout, Factory, Droplets, Mountain, Shield } from "lucide-react";
import { FilterChip, applyMapFilter, landUseFilter, toggleFilter, type MapFilter } from "@/lib/mapFilters";
import { MAP_COLORS } from "@/lib/colors";

export const Route = createFileRoute("/comparison")({
  head: () => ({
    meta: [
      { title: "مقارنة استخدامات الأراضي 2016–2026 | طريق القاهرة–الإسماعيلية" },
      { name: "description", content: "مقارنة مباشرة بين خرائط 2016 و2026 توضح تغير مساحات الاستخدامات العمرانية والزراعية والصناعية والمياه." },
      { property: "og:title", content: "مقارنة استخدامات الأراضي بين 2016 و2026" },
      { property: "og:description", content: "خريطتان متزامنتان ورسوم مقارنة وجداول توضح مقدار واتجاه التغير في كل استخدام للأرض." },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/comparison" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/comparison" }],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { t } = useI18n();
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const useLegend = useUseLegend(["حضري / عمراني", "زراعي", "صناعي", "ارض فضاء", "خدمات"]);
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapFilter | null>(null);

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const selectLandUse = (label: string, rawName: string) =>
    toggleFilter(
      selectedMapFilter,
      landUseFilter(label, ["Land_Cover2016", "Land_Cover2026"], rawName),
      setSelectedMapFilter,
    );

  return (
    <>
      <TopBar title={t.nav.comparison} subtitle={t.charts.compareUse} />

      {s && (
        <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <DeltaStatCard label={t.stats.urbanArea} v2016={pickArea(a, "حضري / عمراني")} v2026={pickArea(b, "حضري / عمراني")} unit={t.stats.km2} accent="urban" icon={<Building2 className="h-3.5 w-3.5" />} />
          <DeltaStatCard label={t.stats.agriArea} v2016={pickArea(a, "زراعي")} v2026={pickArea(b, "زراعي")} unit={t.stats.km2} accent="agri" icon={<Sprout className="h-3.5 w-3.5" />} />
          <DeltaStatCard label={t.stats.industrialArea} v2016={pickArea(a, "صناعي")} v2026={pickArea(b, "صناعي")} unit={t.stats.km2} accent="industrial" icon={<Factory className="h-3.5 w-3.5" />} />
          <DeltaStatCard label="أرض فضاء" v2016={pickArea(a, "ارض فضاء")} v2026={pickArea(b, "ارض فضاء")} unit={t.stats.km2} accent="brand" invert icon={<Mountain className="h-3.5 w-3.5" />} />
          <DeltaStatCard label={t.stats.waterArea} v2016={pickArea(a, "مياه")} v2026={pickArea(b, "مياه")} unit={t.stats.km2} accent="water" icon={<Droplets className="h-3.5 w-3.5" />} />
          <DeltaStatCard label="منطقة عسكرية" v2016={pickArea(a, "منطقة عسكرية")} v2026={pickArea(b, "منطقة عسكرية")} unit={t.stats.km2} accent="accent" invert icon={<Shield className="h-3.5 w-3.5" />} />
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <Panel title={`${t.map.title} — ${t.map.year2016}`} className="dashboard-map-sticky !p-2">
          <FilterChip filter={selectedMapFilter} onClear={() => setSelectedMapFilter(null)} />
          <MapViewClient height="clamp(360px, 52dvh, 520px)" initialBasemap="satellite" syncGroup="comparison-maps" showLegend defaultLayerControlOpen={false} defaultLegendOpen={false} legendItems={useLegend} layers={[
            { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: MAP_COLORS.studyArea },
            { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: MAP_COLORS.axisRoad, weight: 4 },
            { key: "Land_Cover2016", label: t.layers.land_2016, type: "polygon", styleBy: "use", fillOpacity: 0.82, weight: 0.25 },
          ]} initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2016"]} showTransit filterFn={applyMapFilter(selectedMapFilter)} />
        </Panel>
        <Panel title={`${t.map.title} — ${t.map.year2026}`} className="dashboard-map-sticky !p-2">
          <FilterChip filter={selectedMapFilter} onClear={() => setSelectedMapFilter(null)} />
          <MapViewClient height="clamp(360px, 52dvh, 520px)" initialBasemap="satellite" syncGroup="comparison-maps" showLegend defaultLayerControlOpen={false} defaultLegendOpen={false} legendItems={useLegend} layers={[
            { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: MAP_COLORS.studyArea },
            { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: MAP_COLORS.axisRoad, weight: 4 },
            { key: "Land_Cover2026", label: t.layers.land_2026, type: "polygon", styleBy: "use", fillOpacity: 0.82, weight: 0.25 },
          ]} initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Land_Cover2026"]} showTransit filterFn={applyMapFilter(selectedMapFilter)} />
        </Panel>
      </div>
      <p className="mt-1 text-center text-xs font-semibold text-muted-foreground">
        {t.map.year2016} و{t.map.year2026} معروضان من طبقتين منفصلتين؛ لذلك تظل العناصر الموجودة في سنة واحدة فقط ظاهرة في خريطتها دون اختفائها أو دمجها مع السنة الأخرى.
      </p>

      {/* % share comparison */}
      <div className="mt-2">
        <Panel title={t.charts.shareCompare}>
          {s && <ShareCompareChart a={s.land_cover_2016} b={s.land_cover_2026} labelA={t.map.year2016} labelB={t.map.year2026} height={210} selectedName={selectedMapFilter?.label} onSelect={(item) => selectLandUse(item.name, item.name)} />}
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <Panel title={t.charts.compareUse} className="min-h-[300px]">
          {s && <CompareYearsChart a={s.land_cover_2016} b={s.land_cover_2026} labelA={t.map.year2016} labelB={t.map.year2026} height={290} selectedName={selectedMapFilter?.label} onSelect={(item) => selectLandUse(item.name, item.name)} />}
        </Panel>
        <Panel title={t.charts.deltaTitle} className="min-h-[300px]">
          {s && <DeltaBarChart a={s.land_cover_2016} b={s.land_cover_2026} height={290} selectedName={selectedMapFilter?.label} onSelect={(item) => selectLandUse(item.name, item.name)} />}
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <Panel title={`${t.charts.radar} — ${t.map.year2016}`} className="min-h-[270px]">
          {s && <RadarProfileChart data={s.land_cover_2016} color={MAP_COLORS.studyArea} height={250} />}
        </Panel>
        <Panel title={`${t.charts.radar} — ${t.map.year2026}`} className="min-h-[270px]">
          {s && <RadarProfileChart data={s.land_cover_2026} color={MAP_COLORS.axisRoad} height={250} />}
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-[2fr_1fr]">
        <Panel title={t.charts.changeTable} className="min-h-[360px]">
          {s && <ChangeTable a={s.land_cover_2016} b={s.land_cover_2026} limit={14} />}
        </Panel>
        <Panel title={t.charts.movers} className="min-h-[240px]">
          {s && <MoversBoard a={s.land_cover_2016} b={s.land_cover_2026} />}
        </Panel>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        <InsightCard tone="positive" title={t.insights.urbanBoomTitle} body={t.insights.urbanBoomBody} />
        <InsightCard tone="positive" title={t.insights.agriExpandTitle} body={t.insights.agriExpandBody} />
        <InsightCard tone="positive" title={t.insights.industrialUpTitle} body={t.insights.industrialUpBody} />
        <InsightCard tone="positive" title={t.insights.vacantDropTitle} body={t.insights.vacantDropBody} />
        <InsightCard tone="warning" title={t.insights.waterRiskTitle} body={t.insights.waterRiskBody} />
        <InsightCard tone="info" title={t.insights.militaryTitle} body={t.insights.militaryBody} />
        <InsightCard tone="info" title={t.insights.axisCorridorTitle} body={t.insights.axisCorridorBody} />
        <InsightCard tone="info" title={t.insights.investmentTitle} body={t.insights.investmentBody} />
      </div>
    </>
  );
}
