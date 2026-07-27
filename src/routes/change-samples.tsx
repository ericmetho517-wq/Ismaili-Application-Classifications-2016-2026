import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { ChangeSamplesCarousel, ChangeSamplesSummary } from "@/components/ChangeSamplesCarousel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/change-samples")({
  head: () => ({
    meta: [
      { title: "عينات مكانية للتغير 2016–2026 | طريق القاهرة–الإسماعيلية" },
      {
        name: "description",
        content:
          "عينات مكانية مكبرة تقارن تغيرات استخدامات الأراضي على طريق القاهرة–الإسماعيلية الصحراوي بين 2016 و2026.",
      },
      { property: "og:title", content: "عينات مكانية للتغير بين 2016 و2026" },
      {
        property: "og:description",
        content:
          "عينات خرائط متزامنة ومكبرة توضح التغيرات العمرانية والزراعية والصناعية والمائية بصورة سهلة.",
      },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/change-samples" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/change-samples" }],
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
