import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { loadSummary, loadLayer, pickArea, pickCount } from "@/lib/data";
import { useI18n, formatNum } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { InsightCard } from "@/components/InsightCard";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { PercentBarChart, TopNBarChart, LorenzCurveChart, DonutKPI, RadialGauge } from "@/components/Charts";
import { sizeBuckets, median, concentration } from "@/lib/histogram";
import { Sprout, Layers, MapIcon, TrendingUp, Ruler, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsTable } from "@/components/DetailsTable";
import { FeatureInspector } from "@/components/FeatureInspector";
import { MetricStrip } from "@/components/MetricStrip";
import { FIELDS, groupByField, priceMetrics, rowsFromFeatures, type DetailRow } from "@/lib/analytics";
import { FilterChip, applyMapFilter, bucketFilter, fieldFilter, rowFilter, toggleFilter, type MapFilter } from "@/lib/mapFilters";

export const Route = createFileRoute("/agricultural")({
  head: () => ({
    meta: [
      { title: "تحليل الأراضي الزراعية | طريق القاهرة–الإسماعيلية الصحراوي" },
      { name: "description", content: "تحليل مساحات الأراضي الزراعية وأحجام القطع ودرجة التركز والتغير بين 2016 و2026 على طريق القاهرة–الإسماعيلية الصحراوي." },
      { property: "og:title", content: "تحليل الأراضي الزراعية | طريق القاهرة–الإسماعيلية الصحراوي" },
      { property: "og:description", content: "خرائط ورسوم توضح مساحات الزراعة وأحجام القطع وأكبر الأراضي والتغير بين 2016 و2026." },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/agricultural" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/agricultural" }],
  }),
  component: AgriPage,
});

function AgriPage() {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<DetailRow | undefined>();
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapFilter | null>(null);
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const { data: fc } = useQuery({
    queryKey: ["layer", "Agricultural_Changes"],
    queryFn: () => loadLayer("Agricultural_Changes"),
  });

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const agri2016 = pickArea(a, "زراعي");
  const agri2026 = pickArea(b, "زراعي");
  const cnt2016 = pickCount(a, "زراعي");
  const cnt2026 = pickCount(b, "زراعي");
  const share = s ? (agri2026 / s.totals.study_area_km2) * 100 : 0;
  const growthPct = agri2016 > 0 ? ((agri2026 - agri2016) / agri2016) * 100 : 0;

  // Plot-level analytics from real feddan field
  const stats = useMemo(() => {
    const feddans =
      fc?.features.map((f) => Number(f.properties?.[FIELDS.feddan] ?? 0)).filter((v) => v > 0) ?? [];
    const total = feddans.reduce((s2, v) => s2 + v, 0);
    return {
      feddans,
      total,
      avg: feddans.length ? total / feddans.length : 0,
      med: median(feddans),
      largest: feddans.length ? Math.max(...feddans) : 0,
      conc10: concentration(feddans, 0.1),
    };
  }, [fc]);

  const sizeDist = useMemo(
    () =>
      sizeBuckets(stats.feddans, [
        { label: "< 1", min: 0, max: 1 },
        { label: "1 â€“ 5", min: 1, max: 5 },
        { label: "5 â€“ 20", min: 5, max: 20 },
        { label: "20 â€“ 100", min: 20, max: 100 },
        { label: "100 â€“ 500", min: 100, max: 500 },
        { label: "500+", min: 500, max: Infinity },
      ]),
    [stats.feddans],
  );
  const selectSizeBucket = (label: string) => {
    const bucket = [
      { label: "< 1", min: 0, max: 1 },
      { label: "1 â€“ 5", min: 1, max: 5 },
      { label: "5 â€“ 20", min: 5, max: 20 },
      { label: "20 â€“ 100", min: 20, max: 100 },
      { label: "100 â€“ 500", min: 100, max: 500 },
      { label: "500+", min: 500, max: Infinity },
    ].find((item) => item.label === label);
    if (bucket) toggleFilter(selectedMapFilter, bucketFilter(bucket.label, "Agricultural_Changes", "feddan", bucket.min, bucket.max), setSelectedMapFilter);
  };

  const topPlots = useMemo(() => {
    if (!fc) return [];
    return [...fc.features]
      .map((f, i) => ({
        name: `${formatNum(Number((f.properties as any)?.[FIELDS.feddan] ?? 0), lang, 0)} ${t.stats.feddan} · ${i + 1}`,
        area_km2: Number((f.properties as any)?.[FIELDS.feddan] ?? 0),
        count: 1,
      }))
      .sort((x, y) => y.area_km2 - x.area_km2)
      .slice(0, 10);
  }, [fc, lang, t.stats.feddan]);

  const cropMix = useMemo(() => groupByField(fc, FIELDS.crop, { top: 8 }), [fc]);
  const ownerMix = useMemo(() => groupByField(fc, FIELDS.ownership, { top: 8 }), [fc]);
  const useMix = useMemo(() => groupByField(fc, FIELDS.useDesc, { top: 8 }), [fc]);
  const detailRows = useMemo(
    () => rowsFromFeatures(fc, { nameField: FIELDS.useDesc, typeField: FIELDS.crop, areaUnit: "feddan", limit: 300 }),
    [fc],
  );
  const prices = useMemo(() => priceMetrics(fc), [fc]);
  const selectField = (label: string, field: string, value: unknown) =>
    toggleFilter(selectedMapFilter, fieldFilter(label, "Agricultural_Changes", field, value), setSelectedMapFilter);
  const selectRow = (row: DetailRow) => {
    setSelected(row);
    toggleFilter(selectedMapFilter, rowFilter(row.name, "Agricultural_Changes", row), setSelectedMapFilter);
  };

  return (
    <>
      <TopBar title={t.nav.agricultural} subtitle={t.layers.agri} />

      {/* Snapshot KPIs */}
      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatCard label={t.stats.agriArea} value={agri2026} unit={t.stats.km2} accent="agri" icon={<Sprout className="h-5 w-5" />} />
        <StatCard label={t.stats.featuresCount} value={cnt2026} accent="agri" icon={<Layers className="h-5 w-5" />} />
        <StatCard label={`${t.stats.agriArea} %`} value={share.toFixed(2)} unit="%" accent="brand" icon={<MapIcon className="h-5 w-5" />} />
        <StatCard label={t.common.total} value={Math.round(stats.total)} unit={t.stats.feddan} accent="accent" icon={<Sprout className="h-5 w-5" />} />
        <StatCard label={t.common.avg} value={stats.avg.toFixed(1)} unit={t.stats.feddan} accent="agri" icon={<Ruler className="h-5 w-5" />} hint={`${t.common.median}: ${stats.med.toFixed(1)}`} />
        <StatCard label={t.common.concentration} value={stats.conc10.toFixed(1)} unit="%" accent="industrial" icon={<Target className="h-5 w-5" />} hint={`${t.common.largest}: ${stats.largest.toFixed(0)} ${t.stats.feddan}`} />
      </div>

      {/* 2016 â†’ 2026 delta */}
      {s && (
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <DeltaStatCard label={`${t.stats.agriArea} (${t.stats.km2})`} v2016={agri2016} v2026={agri2026} unit={t.stats.km2} accent="agri" icon={<Sprout className="h-4 w-4" />} />
          <DeltaStatCard label={t.stats.featuresCount} v2016={cnt2016} v2026={cnt2026} accent="agri" icon={<Layers className="h-4 w-4" />} />
          <DeltaStatCard label={`${t.common.share} (%)`} v2016={s.totals.study_area_km2 > 0 ? +((agri2016 / s.totals.study_area_km2) * 100).toFixed(2) : 0} v2026={+share.toFixed(2)} unit="%" accent="brand" icon={<TrendingUp className="h-4 w-4" />} />
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
              { key: "Agricultural_Changes", label: t.layers.agri, type: "polygon", fixedColor: "#22c55e" },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Agricultural_Changes"]}
            filterFn={applyMapFilter(selectedMapFilter)}
          />
        </Panel>
        <div className="flex flex-col gap-2">
          <Panel title={t.charts.plotSizeAgri}>
            <PercentBarChart data={sizeDist} unit={t.stats.feddan} height={220} palette={["#86efac", "#4ade80", "#22c55e", "#16a34a", "#15803d", "#14532d"]} selectedName={selectedMapFilter?.label} onSelect={(item) => selectSizeBucket(item.name)} />
          </Panel>
          <Panel title={t.charts.topPlots}>
            <TopNBarChart data={topPlots} unit={t.stats.feddan} color="#22c55e" height={220} />
          </Panel>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <Panel title={t.charts.cumulativeAgri}>
          <LorenzCurveChart values={stats.feddans} height={220} color="#22c55e" xLabel={t.stats.feddan} yLabel={`${t.common.area} %`} />
        </Panel>
        <Panel title={t.charts.landShareDonut}>
          {s && <DonutKPI value={agri2026} total={s.totals.study_area_km2} label={`${t.stats.agriArea} / ${t.stats.studyArea}`} color="#22c55e" />}
        </Panel>
        <Panel title={t.common.concentration}>
          <RadialGauge value={stats.conc10} label={t.common.concentration} color="#16a34a" />
        </Panel>
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "تفاصيل الزراعة التفاعلية" : "Interactive agricultural details"}>
          <Tabs defaultValue="mix" className="min-h-[330px]">
            <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
              <TabsTrigger value="mix" className="text-xs">{lang === "ar" ? "الاستخدامات" : "Land uses"}</TabsTrigger>
              <TabsTrigger value="crops" className="text-xs">{lang === "ar" ? "المحاصيل" : "Crops"}</TabsTrigger>
              <TabsTrigger value="prices" className="text-xs">{lang === "ar" ? "الأسعار" : "Prices"}</TabsTrigger>
              <TabsTrigger value="details" className="text-xs">{lang === "ar" ? "جدول التفاصيل" : "Details table"}</TabsTrigger>
            </TabsList>
            <TabsContent value="mix" className="mt-2 grid gap-2 lg:grid-cols-2">
              <TopNBarChart data={useMix} unit={t.stats.km2} color="#22c55e" height={260} translate selectedName={selectedMapFilter?.label} onSelect={(item) => selectField(item.name, FIELDS.useDesc, item.name)} />
              <TopNBarChart data={ownerMix} unit={t.stats.km2} color="#14b8a6" height={260} translate selectedName={selectedMapFilter?.label} onSelect={(item) => selectField(item.name, FIELDS.ownership, item.name)} />
            </TabsContent>
            <TabsContent value="crops" className="mt-2 grid gap-2 lg:grid-cols-2">
              <TopNBarChart data={cropMix} unit={t.stats.km2} color="#84cc16" height={260} translate selectedName={selectedMapFilter?.label} onSelect={(item) => selectField(item.name, FIELDS.crop, item.name)} />
              <FeatureInspector row={selected ?? detailRows[0]} />
            </TabsContent>
            <TabsContent value="prices" className="mt-2">
              <MetricStrip metrics={prices.length ? prices : [{ label: "بيانات الأسعار", value: "غير متاحة", tone: "accent" }]} />
            </TabsContent>
            <TabsContent value="details" className="mt-2 grid gap-2 lg:grid-cols-[1fr_360px]">
              <DetailsTable rows={detailRows} unit="feddan" onSelect={selectRow} />
              <FeatureInspector row={selected ?? detailRows[0]} />
            </TabsContent>
          </Tabs>
        </Panel>
      </div>

      {/* Business insights */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <InsightCard tone="warning" title={t.insights.fragmentationTitle} body={t.insights.fragmentationBody} metric={`${((sizeDist.slice(0, 3).reduce((s2, d) => s2 + d.count, 0) / Math.max(stats.feddans.length, 1)) * 100).toFixed(0)}%`} />
        <InsightCard tone="positive" title={t.insights.largePlotsTitle} body={t.insights.largePlotsBody} metric={`${sizeDist.slice(4).reduce((s2, d) => s2 + d.count, 0)} ${t.stats.feddan}+`} />
        <InsightCard tone="info" title={t.insights.densityTitle} body={t.insights.densityBody} metric={`${(agri2026 / Math.max(cnt2026, 1) * 247).toFixed(1)} ${t.stats.feddan}/${t.common.avg}`} />
      </div>
    </>
  );
}

