import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { loadSummary, pickArea } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { MapViewClient } from "@/components/MapViewClient";
import { ShareComparison, RadialGauge } from "@/components/Charts";
import { ClassificationPrices } from "@/components/ClassificationPrices";
import { MAP_COLORS } from "@/lib/colors";

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
  const { data: s } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });

  const a = s?.land_cover_2016 ?? [];
  const b = s?.land_cover_2026 ?? [];
  const u2016 = pickArea(a, "حضري / عمراني");
  const u2026 = pickArea(b, "حضري / عمراني");
  const growthPct = u2016 > 0 ? ((u2026 - u2016) / u2016) * 100 : 0;

  return (
    <>
      <TopBar title={t.nav.urban} subtitle={t.layers.urban} />

      <div>
        <Panel title={t.map.title} className="dashboard-map-sticky !p-2">
          <MapViewClient
            height="clamp(300px, 48dvh, 500px)"
            layers={[
              {
                key: "Study_Area_Sector",
                label: t.layers.study_area,
                type: "boundary",
                fixedColor: MAP_COLORS.studyArea,
              },
              {
                key: "Axis_Road_Sector",
                label: t.layers.axis,
                type: "line",
                fixedColor: MAP_COLORS.axisRoad,
                weight: 4,
              },
              {
                key: "Urban_Changes",
                label: t.layers.urban,
                type: "polygon",
                fixedColor: MAP_COLORS.urban,
                highlightCircles: true,
              },
            ]}
            initialActive={["Study_Area_Sector", "Axis_Road_Sector", "Urban_Changes"]}
            showTransit
          />
        </Panel>
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <Panel title={t.charts.landShareDonut}>
          {s && <ShareComparison value2016={u2016} value2026={u2026} total={s.totals.study_area_km2} color={MAP_COLORS.urban} />}
        </Panel>
        <Panel title={t.common.growth}>
          <RadialGauge
            value={Math.min(100, Math.max(0, growthPct))}
            label={t.common.growth}
            color={MAP_COLORS.urban}
            max={Math.max(100, growthPct + 10)}
          />
        </Panel>
      </div>

      <div className="mt-2">
        <Panel title={lang === "ar" ? "أسعار العمران" : "Urban prices"}>
          <ClassificationPrices domain="urban" />
        </Panel>
      </div>

    </>
  );
}
