import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { loadSummary, loadMapLayer, pickArea, pickCount } from "@/lib/data";
import { useI18n, formatNum } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { DeltaStatCard } from "@/components/DeltaStatCard";
import { InsightCard } from "@/components/InsightCard";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import {
  PercentBarChart,
  TopNBarChart,
  LorenzCurveChart,
  DonutKPI,
  RadialGauge,
} from "@/components/Charts";
import { sizeBuckets, median, concentration } from "@/lib/histogram";
import { Building2, Layers, MapIcon, TrendingUp, Ruler, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DetailsTable } from "@/components/DetailsTable";
import { FeatureInspector } from "@/components/FeatureInspector";
import { MetricStrip } from "@/components/MetricStrip";
import {
  FIELDS,
  areaStats,
  groupByField,
  metricsFromStats,
  rowsFromFeatures,
  type DetailRow,
} from "@/lib/analytics";
import {
  FilterChip,
  applyMapFilter,
  bucketFilter,
  fieldFilter,
  rowFilter,
  toggleFilter,
  type MapFilter,
} from "@/lib/mapFilters";

export const Route = createFileRoute("/urban")({
  head: () => ({
    meta: [
      { title: "تحليل النمو العمراني | طريق القاهرة–الإسماعيلية الصحراوي" },
      {
        name: "description",
        content:
          "تحليل مبسط للنمو العمراني وأحجام المباني ومناطق الكثافة على طريق القاهرة–الإسماعيلية الصحراوي بين 2016 و2026.",
      },
      { property: "og:title", content: "تحليل النمو العمراني | طريق القاهرة–الإسماعيلية الصحراوي" },
      {
        property: "og:description",
        content:
          "خرائط ومؤشرات توضح توسع العمران وأحجام المباني ومناطق الكثافة بين 2016 و2026.",
      },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/urban" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/urban" }],
  }),
  component: UrbanPage,
});

function UrbanPage() {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<DetailRow | undefined>();
  const [selectedMapFilter, setSelectedMapFilter] = useState<MapFilter | null>(null);
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const { data: fc } = useQuery({
    queryKey: ["map-layer", "Urban_Changes"],
    queryFn: () => loadMapLayer("Urban_Changes"),
  });

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const u2016 = pickArea(a, "حضري / عمراني");
  const u2026 = pickArea(b, "حضري / عمراني");
  const c2016 = pickCount(a, "حضري / عمراني");
  const c2026 = pickCount(b, "حضري / عمراني");
  const share = s ? (u2026 / s.totals.study_area_km2) * 100 : 0;
  const growthPct = u2016 > 0 ? ((u2026 - u2016) / u2016) * 100 : 0;

  // Footprint stats in mÂ²
  const stats = useMemo(() => {
    const m2 =
      fc?.features.map((f) => Number(f.properties?.["SHAPE_Area"] ?? 0)).filter((v) => v > 0) ?? [];
    const total = m2.reduce((s2, v) => s2 + v, 0);
    return {
      m2,
      total,
      avg: m2.length ? total / m2.length : 0,
      med: median(m2),
      largest: m2.length ? Math.max(...m2) : 0,
      conc10: concentration(m2, 0.1),
    };
  }, [fc]);

  const sizeDist = useMemo(
    () =>
      sizeBuckets(stats.m2, [
        { label: "< 500", min: 0, max: 500 },
        { label: "500 â€“ 2k", min: 500, max: 2000 },
        { label: "2k â€“ 5k", min: 2000, max: 5000 },
        { label: "5k â€“ 20k", min: 5000, max: 20000 },
        { label: "20k â€“ 100k", min: 20000, max: 100000 },
        { label: "100k+", min: 100000, max: Infinity },
      ]),
    [stats.m2],
  );
  const selectSizeBucket = (label: string) => {
    const bucket = [
      { label: "< 500", min: 0, max: 500 },
      { label: "500 â€“ 2k", min: 500, max: 2000 },
      { label: "2k â€“ 5k", min: 2000, max: 5000 },
      { label: "5k â€“ 20k", min: 5000, max: 20000 },
      { label: "20k â€“ 100k", min: 20000, max: 100000 },
      { label: "100k+", min: 100000, max: Infinity },
    ].find((item) => item.label === label);
    if (bucket)
      toggleFilter(
        selectedMapFilter,
        bucketFilter(bucket.label, "Urban_Changes", "m2", bucket.min, bucket.max),
        setSelectedMapFilter,
      );
  };

  const topBlocks = useMemo(() => {
    if (!fc) return [];
    return [...fc.features]
      .map((f, i) => ({
        name: `${(f.properties as any)?.[FIELDS.useDesc] ?? "سكني"} · ${i + 1}`,
        area_km2: Number((f.properties as any)?.["SHAPE_Area"] ?? 0) / 1e6,
        count: 1,
      }))
      .sort((x, y) => y.area_km2 - x.area_km2)
      .slice(0, 10);
  }, [fc]);

  const density = u2026 > 0 ? c2026 / u2026 : 0;
  const urbanTypes = useMemo(() => groupByField(fc, FIELDS.urbanType, { top: 10 }), [fc]);
  const detailRows = useMemo(
    () =>
      rowsFromFeatures(fc, { nameField: FIELDS.urbanType, typeField: FIELDS.useDesc, limit: 300 }),
    [fc],
  );
  const derivedStats = useMemo(() => areaStats(fc), [fc]);
  const selectField = (label: string, field: string, value: unknown) =>
    toggleFilter(
      selectedMapFilter,
      fieldFilter(label, "Urban_Changes", field, value),
      setSelectedMapFilter,
    );
  const selectRow = (row: DetailRow) => {
    setSelected(row);
    toggleFilter(
      selectedMapFilter,
      rowFilter(row.name, "Urban_Changes", row),
      setSelectedMapFilter,
    );
  };

  return (
    <>
      <TopBar title={t.nav.urban} subtitle={t.layers.urban} />

      <div className="mb-2 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label={t.stats.urbanArea}
          value={u2026}
          unit={t.stats.km2}
          accent="urban"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label={t.stats.featuresCount}
          value={c2026}
          accent="urban"
          icon={<Layers className="h-5 w-5" />}
        />
        <StatCard
          label={`${t.stats.urbanArea} %`}
          value={share.toFixed(2)}
          unit="%"
          accent="brand"
          icon={<MapIcon className="h-5 w-5" />}
        />
        <StatCard
          label={t.common.growth}
          value={(growthPct >= 0 ? "+" : "") + growthPct.toFixed(1)}
          unit="%"
          accent="accent"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label={`${t.common.avg} (m²)`}
          value={Math.round(stats.avg)}
          accent="urban"
          icon={<Ruler className="h-5 w-5" />}
          hint={`${t.common.median}: ${formatNum(stats.med, lang, 0)}`}
        />
        <StatCard
          label="Density /km²"
          value={Math.round(density)}
          accent="industrial"
          icon={<Target className="h-5 w-5" />}
          hint={`${t.common.concentration}: ${stats.conc10.toFixed(0)}%`}
        />
      </div>

      {s && (
        <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <DeltaStatCard
            label={`${t.stats.urbanArea} (${t.stats.km2})`}
            v2016={u2016}
            v2026={u2026}
            unit={t.stats.km2}
            accent="urban"
            icon={<Building2 className="h-4 w-4" />}
          />
          <DeltaStatCard
            label={t.stats.featuresCount}
            v2016={c2016}
            v2026={c2026}
            accent="urban"
            icon={<Layers className="h-4 w-4" />}
          />
          <DeltaStatCard
            label={`${t.common.share} (%)`}
            v2016={
              s.totals.study_area_km2 > 0
                ? +((u2016 / s.totals.study_area_km2) * 100).toFixed(2)
                : 0
            }
            v2026={+share.toFixed(2)}
            unit="%"
            accent="brand"
          />
        </div>
      )}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title={t.map.title} className="!p-2">
          <FilterChip filter={selectedMapFilter} onClear={() => setSelectedMapFilter(null)} />
          <MapViewClient
            height="clamp(300px, 48dvh, 500px)"
            layers={[
              {
                key: "Study_Area_Sector",
                label: t.layers.study_area,
                type: "boundary",
                fixedColor: "#22d3ee",
              },
              {
                key: "Axis_Road_Sector",
                label: t.layers.axis,
                type: "line",
                fixedColor: "#f59e0b",
                weight: 4,
              },
              {
                key: "Urban_Changes",
                label: t.layers.urban,
                type: "polygon",
                fixedColor: "#ef4444",
              },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Urban_Changes"]}
            filterFn={applyMapFilter(selectedMapFilter)}
          />
        </Panel>
        <div className="flex flex-col gap-2">
          <Panel title={t.charts.urbanBlockSize}>
            <PercentBarChart
              data={sizeDist}
              unit="m²"
              height={220}
              palette={["#fecaca", "#fca5a5", "#f87171", "#ef4444", "#dc2626", "#991b1b"]}
              selectedName={selectedMapFilter?.label}
              onSelect={(item) => selectSizeBucket(item.name)}
            />
          </Panel>
          <Panel title={t.charts.topUrbanBlocks}>
            <TopNBarChart
              data={topBlocks}
              unit={t.stats.km2}
              color="#ef4444"
              height={220}
              translate
            />
          </Panel>
        </div>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <Panel title={t.charts.cumulativeUrban}>
          <LorenzCurveChart
            values={stats.m2}
            height={220}
            color="#ef4444"
            xLabel="Blocks %"
            yLabel={`${t.common.area} %`}
          />
        </Panel>
        <Panel title={t.charts.landShareDonut}>
          {s && (
            <DonutKPI
              value={u2026}
              total={s.totals.study_area_km2}
              label={`${t.stats.urbanArea} / ${t.stats.studyArea}`}
              color="#ef4444"
            />
          )}
        </Panel>
        <Panel title={t.common.growth}>
          <RadialGauge
            value={Math.min(100, Math.max(0, growthPct))}
            label={t.common.growth}
            color="#f97316"
            max={Math.max(100, growthPct + 10)}
          />
        </Panel>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <InsightCard
          tone="positive"
          title={t.insights.urbanBoomTitle}
          body={t.insights.urbanBoomBody}
          metric={`${growthPct >= 0 ? "+" : ""}${growthPct.toFixed(0)}%`}
        />
        <InsightCard
          tone="info"
          title={t.insights.residentialDominanceTitle}
          body={t.insights.residentialDominanceBody}
          metric="~100%"
        />
        <InsightCard
          tone="warning"
          title={t.insights.densityTitle}
          body={t.insights.densityBody}
          metric={`${Math.round(density)} /${t.stats.km2}`}
        />
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "تفاصيل العمران التفاعلية" : "Interactive urban details"}>
          <Tabs defaultValue="types" className="min-h-[330px]">
            <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
              <TabsTrigger value="types" className="text-xs">
                {lang === "ar" ? "أنماط العمران" : "Urban patterns"}
              </TabsTrigger>
              <TabsTrigger value="metrics" className="text-xs">
                {lang === "ar" ? "مؤشرات" : "Metrics"}
              </TabsTrigger>
              <TabsTrigger value="details" className="text-xs">
                {lang === "ar" ? "جدول التفاصيل" : "Details table"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="types" className="mt-2 grid gap-2 lg:grid-cols-2">
              <TopNBarChart
                data={urbanTypes}
                unit={t.stats.km2}
                color="#ef4444"
                height={260}
                translate
                selectedName={selectedMapFilter?.label}
                onSelect={(item) => selectField(item.name, FIELDS.urbanType, item.name)}
              />
              <FeatureInspector row={selected ?? detailRows[0]} />
            </TabsContent>
            <TabsContent value="metrics" className="mt-2">
              <MetricStrip metrics={metricsFromStats(derivedStats, "العمران")} />
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
