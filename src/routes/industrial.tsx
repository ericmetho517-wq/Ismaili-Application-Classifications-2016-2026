import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { loadSummary, loadLayer, pickArea, pickCount } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { InsightCard } from "@/components/InsightCard";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { PercentBarChart, TopNBarChart, LorenzCurveChart, DonutKPI, RadialGauge } from "@/components/Charts";
import { sizeBuckets, median } from "@/lib/histogram";
import { Factory, Layers, MapIcon, TrendingUp, Ruler, Target, Droplets } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsTable } from "@/components/DetailsTable";
import { FeatureInspector } from "@/components/FeatureInspector";
import { MetricStrip } from "@/components/MetricStrip";
import { FIELDS, areaStats, groupByField, metricsFromStats, rowsFromFeatures, type DetailRow } from "@/lib/analytics";
import { FilterChip, applyMapFilter, bucketFilter, fieldFilter, rowFilter, toggleFilter, type MapFilter } from "@/lib/mapFilters";

export const Route = createFileRoute("/industrial")({
  head: () => ({
    meta: [
      { title: "تحليل المناطق الصناعية | طريق القاهرة–الإسماعيلية الصحراوي" },
      { name: "description", content: "تحليل المنشآت والمناطق الصناعية وأحجامها ونموها على طريق القاهرة–الإسماعيلية الصحراوي بين 2016 و2026." },
      { property: "og:title", content: "تحليل المناطق الصناعية | طريق القاهرة–الإسماعيلية الصحراوي" },
      { property: "og:description", content: "خرائط ومؤشرات توضح أحجام المنشآت الصناعية وأهم المواقع والتوسع الصناعي بين 2016 و2026." },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/industrial" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/industrial" }],
  }),
  component: IndustrialPage,
});

function IndustrialPage() {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<DetailRow | undefined>();
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapFilter | null>(null);
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const { data: fc } = useQuery({
    queryKey: ["layer", "Industrial_Changes"],
    queryFn: () => loadLayer("Industrial_Changes"),
  });

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const ind2016 = pickArea(a, "صناعي");
  const ind2026 = pickArea(b, "صناعي");
  const cnt2016 = pickCount(a, "صناعي");
  const cnt2026 = pickCount(b, "صناعي");
  const share = s ? (ind2026 / s.totals.study_area_km2) * 100 : 0;
  const growthPct = ind2016 > 0 ? ((ind2026 - ind2016) / ind2016) * 100 : 0;

  const stats = useMemo(() => {
    const km2 = fc?.features.map((f) => Number(f.properties?.["SHAPE_Area"] ?? 0) / 1e6).filter((v) => v > 0) ?? [];
    const total = km2.reduce((s2, v) => s2 + v, 0);
    return {
      km2,
      total,
      avg: km2.length ? total / km2.length : 0,
      med: median(km2),
      largest: km2.length ? Math.max(...km2) : 0,
    };
  }, [fc]);

  const sizeDist = useMemo(
    () =>
      sizeBuckets(stats.km2, [
        { label: "< 0.01", min: 0, max: 0.01 },
        { label: "0.01 â€“ 0.05", min: 0.01, max: 0.05 },
        { label: "0.05 â€“ 0.2", min: 0.05, max: 0.2 },
        { label: "0.2 â€“ 1", min: 0.2, max: 1 },
        { label: "1+", min: 1, max: Infinity },
      ]),
    [stats.km2],
  );
  const selectSizeBucket = (label: string) => {
    const bucket = [
      { label: "< 0.01", min: 0, max: 0.01 },
      { label: "0.01 â€“ 0.05", min: 0.01, max: 0.05 },
      { label: "0.05 â€“ 0.2", min: 0.05, max: 0.2 },
      { label: "0.2 â€“ 1", min: 0.2, max: 1 },
      { label: "1+", min: 1, max: Infinity },
    ].find((item) => item.label === label);
    if (bucket) toggleFilter(selectedMapFilter, bucketFilter(bucket.label, "Industrial_Changes", "km2", bucket.min, bucket.max), setSelectedMapFilter);
  };

  const topFacilities = useMemo(
    () =>
      s?.industrial_by_desc
        ?.slice(0, 15)
        .map((d) => ({ ...d, rawName: d.name })) ?? [],
    [s],
  );

  const smeShare =
    sizeDist.slice(0, 2).reduce((s2, d) => s2 + d.count, 0) / Math.max(stats.km2.length, 1);
  const facilityTypes = useMemo(() => groupByField(fc, FIELDS.useDesc, { top: 12 }), [fc]);
  const detailRows = useMemo(
    () => rowsFromFeatures(fc, { nameField: FIELDS.useDesc, typeField: FIELDS.urbanType, limit: 300 }),
    [fc],
  );
  const derivedStats = useMemo(() => areaStats(fc), [fc]);
  const selectField = (label: string, field: string, value: unknown) =>
    toggleFilter(selectedMapFilter, fieldFilter(label, "Industrial_Changes", field, value), setSelectedMapFilter);
  const selectRow = (row: DetailRow) => {
    setSelected(row);
    toggleFilter(selectedMapFilter, rowFilter(row.name, "Industrial_Changes", row), setSelectedMapFilter);
  };

  return (
    <>
      <TopBar title={t.nav.industrial} subtitle={t.layers.industrial} />

      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label={t.stats.industrialArea} value={ind2026} unit={t.stats.km2} accent="industrial" icon={<Factory className="h-5 w-5" />} />
        <StatCard label={t.stats.featuresCount} value={cnt2026} accent="industrial" icon={<Layers className="h-5 w-5" />} />
        <StatCard label={`${t.stats.industrialArea} %`} value={share.toFixed(3)} unit="%" accent="brand" icon={<MapIcon className="h-5 w-5" />} />
        <StatCard label={t.common.growth} value={(growthPct >= 0 ? "+" : "") + growthPct.toFixed(1)} unit="%" accent="accent" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label={t.common.avg} value={stats.avg.toFixed(3)} unit={t.stats.km2} accent="industrial" icon={<Ruler className="h-5 w-5" />} hint={`${t.common.median}: ${stats.med.toFixed(3)}`} />
        <StatCard label={t.common.largest} value={stats.largest.toFixed(2)} unit={t.stats.km2} accent="urban" icon={<Target className="h-5 w-5" />} />
      </div>

      {s && (
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-4">
          <DeltaStatCard label={`${t.stats.industrialArea} (${t.stats.km2})`} v2016={ind2016} v2026={ind2026} unit={t.stats.km2} accent="industrial" icon={<Factory className="h-4 w-4" />} />
          <DeltaStatCard label={t.stats.featuresCount} v2016={cnt2016} v2026={cnt2026} accent="industrial" icon={<Layers className="h-4 w-4" />} />
          <DeltaStatCard label={`${t.common.share} (%)`} v2016={s.totals.study_area_km2 > 0 ? +((ind2016 / s.totals.study_area_km2) * 100).toFixed(3) : 0} v2026={+share.toFixed(3)} unit="%" accent="brand" />
          <DeltaStatCard label={t.stats.waterArea} v2016={pickArea(a, "مياه")} v2026={pickArea(b, "مياه")} unit={t.stats.km2} accent="water" invert icon={<Droplets className="h-4 w-4" />} />
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={t.map.title} className="!p-2">
          <FilterChip filter={selectedMapFilter} onClear={() => setSelectedMapFilter(null)} />
          <MapViewClient
            height="clamp(300px, 48dvh, 500px)"
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: "#22d3ee" },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: "#f59e0b", weight: 4 },
              { key: "Industrial_Changes", label: t.layers.industrial, type: "polygon", fixedColor: "#a855f7" },
              { key: "Water_Changes", label: t.layers.water, type: "polygon", fixedColor: "#3b82f6" },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Industrial_Changes", "Water_Changes"]}
            filterFn={applyMapFilter(selectedMapFilter)}
          />
        </Panel>
        <div className="flex flex-col gap-2">
          <Panel title={t.charts.facilitySize}>
            <PercentBarChart data={sizeDist} unit={t.stats.km2} height={220} palette={["#e9d5ff", "#d8b4fe", "#c084fc", "#a855f7", "#7e22ce"]} selectedName={selectedMapFilter?.label} onSelect={(item) => selectSizeBucket(item.name)} />
          </Panel>
        </div>
      </div>

      <div className="mt-3">
        <Panel title={t.charts.topFacilities}>
          <TopNBarChart
            data={topFacilities}
            unit={t.stats.km2}
            color="#a855f7"
            height={440}
            labelMaxChars={48}
            yAxisWidth={285}
            tickOffset={8}
            translate
            selectedName={selectedMapFilter?.label}
            onSelect={(item: any) => selectField(item.rawName ?? item.name, FIELDS.useDesc, item.rawName ?? item.name)}
          />
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <Panel title={t.charts.cumulativeIndustrial}>
          <LorenzCurveChart values={stats.km2} height={220} color="#a855f7" xLabel="Facilities %" yLabel={`${t.common.area} %`} />
        </Panel>
        <Panel title={t.charts.landShareDonut}>
          {s && <DonutKPI value={ind2026} total={s.totals.study_area_km2} label={`${t.stats.industrialArea} / ${t.stats.studyArea}`} color="#a855f7" />}
        </Panel>
        <Panel title={t.common.growth}>
          <RadialGauge value={Math.min(200, Math.max(0, growthPct))} label={t.common.growth} color="#c084fc" max={Math.max(100, growthPct + 10)} />
        </Panel>
      </div>


      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <InsightCard tone={growthPct >= 0 ? "positive" : "negative"} title={t.insights.industrialUpTitle} body={t.insights.industrialUpBody} metric={`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(0)}%`} />
        <InsightCard tone="warning" title={t.insights.smeIndustrialTitle} body={t.insights.smeIndustrialBody} metric={`${(smeShare * 100).toFixed(0)}%`} />
        <InsightCard tone="info" title={t.insights.axisCorridorTitle} body={t.insights.axisCorridorBody} metric={`${cnt2026} ${t.stats.featuresCount}`} />
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "تفاصيل الصناعة التفاعلية" : "Interactive industrial details"}>
          <Tabs defaultValue="facilities" className="min-h-[330px]">
            <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
              <TabsTrigger value="facilities" className="text-xs">{lang === "ar" ? "المنشآت" : "Facilities"}</TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">{lang === "ar" ? "مؤشرات" : "Metrics"}</TabsTrigger>
              <TabsTrigger value="details" className="text-xs">{lang === "ar" ? "جدول التفاصيل" : "Details table"}</TabsTrigger>
            </TabsList>
            <TabsContent value="facilities" className="mt-2 grid gap-2 lg:grid-cols-2">
              <TopNBarChart data={facilityTypes} unit={t.stats.km2} color="#a855f7" height={260} translate selectedName={selectedMapFilter?.label} onSelect={(item) => selectField(item.name, FIELDS.useDesc, item.name)} />
              <FeatureInspector row={selected ?? detailRows[0]} />
            </TabsContent>
            <TabsContent value="metrics" className="mt-2">
              <MetricStrip metrics={metricsFromStats(derivedStats, "الصناعة")} />
            </TabsContent>
            <TabsContent value="details" className="mt-2 grid gap-2 lg:grid-cols-[1fr_360px]">
              <DetailsTable rows={detailRows} onSelect={selectRow} />
              <FeatureInspector row={selected ?? detailRows[0]} />
            </TabsContent>
          </Tabs>
        </Panel>
      </div>
    </>
  );
}

