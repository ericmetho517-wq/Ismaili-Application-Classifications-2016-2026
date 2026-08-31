import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadSummary, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { DonutKPI, RadialGauge } from "@/components/Charts";
import { ClassificationPrices } from "@/components/ClassificationPrices";
import { MAP_COLORS } from "@/lib/colors";

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
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const ind2016 = pickArea(a, "صناعي");
  const ind2026 = pickArea(b, "صناعي");
  const growthPct = ind2016 > 0 ? ((ind2026 - ind2016) / ind2016) * 100 : 0;


  return (
    <>
      <TopBar title={t.nav.industrial} subtitle={t.layers.industrial} />

      <div>
        <Panel title={t.map.title} className="dashboard-map-sticky !p-2">
          <MapViewClient
            height="clamp(300px, 48dvh, 500px)"
            layers={[
              { key: "Study_Area_Sector", label: t.layers.study_area, type: "boundary", fixedColor: MAP_COLORS.studyArea },
              { key: "Axis_Road_Sector", label: t.layers.axis, type: "line", fixedColor: MAP_COLORS.axisRoad, weight: 4 },
              { key: "Industrial_Changes", label: t.layers.industrial, type: "polygon", fixedColor: MAP_COLORS.industrial },
              { key: "Water_Changes", label: t.layers.water, type: "polygon", fixedColor: MAP_COLORS.water },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Industrial_Changes", "Water_Changes"]}
            showTransit
          />
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <Panel title={t.charts.landShareDonut}>
          {s && <DonutKPI value={ind2026} total={s.totals.study_area_km2} label={`${t.stats.industrialArea} / ${t.stats.studyArea}`} color={MAP_COLORS.industrial} />}
        </Panel>
        <Panel title={t.common.growth}>
          <RadialGauge value={Math.min(200, Math.max(0, growthPct))} label={t.common.growth} color={MAP_COLORS.industrial} max={Math.max(100, growthPct + 10)} />
        </Panel>
      </div>


      <div className="mt-2">
        <Panel title={lang === "ar" ? "أسعار الأراضي الصناعية" : "Industrial prices"}>
          <ClassificationPrices domain="industrial" />
        </Panel>
      </div>
    </>
  );
}

