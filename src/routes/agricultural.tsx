import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadSummary, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { agriculturalLegendItems } from "@/components/MapView";
import { ShareComparison, RadialGauge } from "@/components/Charts";
import { ClassificationPrices } from "@/components/ClassificationPrices";
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
  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const agri2016 = pickArea(a, "زراعي");
  const agri2026 = pickArea(b, "زراعي");
  const growthPct = agri2016 > 0 ? ((agri2026 - agri2016) / agri2016) * 100 : 0;

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
          {s && <ShareComparison value2016={agri2016} value2026={agri2026} total={s.totals.study_area_km2} color={MAP_COLORS.agricultural} />}
        </Panel>
        <Panel title={t.common.growth}>
          <RadialGauge value={Math.min(200, Math.max(0, growthPct))} label={t.common.growth} color={MAP_COLORS.agricultural} max={Math.max(100, growthPct + 10)} />
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

