import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { loadSummary, loadLayer, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { agriculturalLegendItems } from "@/components/MapView";
import { DonutKPI, RadialGauge } from "@/components/Charts";
import { concentration } from "@/lib/histogram";
import { ClassificationPrices } from "@/components/ClassificationPrices";
import { FIELDS } from "@/lib/analytics";
import { MAP_COLORS } from "@/lib/colors";

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
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });
  const { data: fc } = useQuery({
    queryKey: ["layer", "Agricultural_Changes"],
    queryFn: () => loadLayer("Agricultural_Changes"),
  });

  const b = s?.land_cover_2026 ?? [];
  const agri2026 = pickArea(b, "زراعي");

  const stats = useMemo(() => {
    const feddans =
      fc?.features.map((f) => Number(f.properties?.[FIELDS.feddan] ?? 0)).filter((v) => v > 0) ?? [];
    return {
      feddans,
      conc10: concentration(feddans, 0.1),
    };
  }, [fc]);

  return (
    <>
      <TopBar title={t.nav.agricultural} subtitle={t.layers.agri} />

      <div>
        <Panel title={t.map.title} className="dashboard-map-sticky !p-2">
          <MapViewClient
            height="clamp(300px, 48dvh, 500px)"
            showLegend
            defaultLegendOpen
            legendItems={agriculturalLegendItems(lang)}
            legendTitle={lang === "ar" ? "نوع النشاط الزراعي" : "Agricultural activity"}
            legendHint={lang === "ar" ? "ألوان منفصلة للأراضي والمزارع والصوب" : "Separate colors for land, farms, and greenhouses"}
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: MAP_COLORS.studyArea },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: MAP_COLORS.axisRoad, weight: 4 },
              { key: "Agricultural_Changes", label: t.layers.agri, type: "polygon", styleBy: "agriculture", weight: 0.8, fillOpacity: 0.48 },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Agricultural_Changes"]}
            showTransit
          />
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <Panel title={t.charts.landShareDonut}>
          {s && <DonutKPI value={agri2026} total={s.totals.study_area_km2} label={`${t.stats.agriArea} / ${t.stats.studyArea}`} color={MAP_COLORS.agricultural} />}
        </Panel>
        <Panel title={t.common.concentration}>
          <RadialGauge value={stats.conc10} label={t.common.concentration} color={MAP_COLORS.agricultural} />
        </Panel>
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "أسعار الأراضي الزراعية" : "Agricultural prices"}>
          <ClassificationPrices domain="agri" />
        </Panel>
      </div>

    </>
  );
}

