import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { ChangeSamplesCarousel, ChangeSamplesSummary } from "@/components/ChangeSamplesCarousel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/change-samples")({
  head: () => ({
    meta: [
      { title: "Close Change Samples 2016 vs 2026 — Ismailia Geo Dashboard" },
      {
        name: "description",
        content:
          "Close-zoom swipe samples comparing local land-use changes across Ismailia between 2016 and 2026.",
      },
      { property: "og:title", content: "Close Change Samples 2016 vs 2026 — Ismailia" },
      {
        property: "og:description",
        content:
          "Thirty filterable close-up samples with synchronized 2016 and 2026 maps for urban, agricultural, industrial and water changes.",
      },
      { property: "og:url", content: "https://ismailia-insight-hub.lovable.app/change-samples" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-insight-hub.lovable.app/change-samples" }],
  }),
  component: ChangeSamplesPage,
});

function ChangeSamplesPage() {
  const { t } = useI18n();

  return (
    <>
      <TopBar title={t.changeSamples.title} subtitle={t.changeSamples.subtitle} />
      <ChangeSamplesSummary />
      <Panel title={t.changeSamples.carouselTitle} className="min-h-0">
        <ChangeSamplesCarousel />
      </Panel>
    </>
  );
}
