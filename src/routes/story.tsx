import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarRange, Layers3 } from "lucide-react";
import { loadSummary } from "@/lib/data";
import { useI18n, formatNum } from "@/lib/i18n";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { ChangeStoryCarousel } from "@/components/ChangeStoryCarousel";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "قصة التغير 2016–2026 | طريق القاهرة–الإسماعيلية الصحراوي" },
      {
        name: "description",
        content:
          "عرض مبسط وتفاعلي يشرح أبرز تغيرات استخدامات الأراضي على طريق القاهرة–الإسماعيلية الصحراوي بين 2016 و2026.",
      },
      { property: "og:title", content: "قصة التغير 2016–2026 | طريق القاهرة–الإسماعيلية" },
      {
        property: "og:description",
        content:
          "قصة مرئية تشرح التغيرات العمرانية والزراعية والصناعية والأراضي الفضاء والمياه خطوة بخطوة.",
      },
      { property: "og:url", content: "https://ismailia-geo-dashboard.vercel.app/story" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://ismailia-geo-dashboard.vercel.app/story" }],
  }),
  component: StoryPage,
});

function StoryPage() {
  const { t, lang } = useI18n();
  const { data: summary, isLoading } = useQuery({ queryKey: ["summary"], queryFn: loadSummary });

  return (
    <>
      <TopBar title={t.story.title} subtitle={t.story.subtitle} />

      <div className="mb-2 grid gap-2 md:grid-cols-3">
        <StorySummaryItem
          icon={<Layers3 className="h-4 w-4" />}
          label={t.story.summaryStudyArea}
          value={summary ? formatNum(summary.totals.study_area_km2, lang) : t.common.loading}
          suffix={summary ? t.stats.km2 : undefined}
        />
        <StorySummaryItem
          icon={<CalendarRange className="h-4 w-4" />}
          label={t.story.summaryPeriod}
          value="2016 - 2026"
        />
        <StorySummaryItem
          icon={<BarChart3 className="h-4 w-4" />}
          label={t.story.summaryIndicators}
          value="6"
        />
      </div>

      <Panel title={t.story.carouselTitle} className="min-h-0" fitContent>
        {isLoading && (
          <div className="flex min-h-[520px] items-center justify-center text-sm text-muted-foreground">
            {t.common.loading}
          </div>
        )}
        {summary && <ChangeStoryCarousel summary={summary} />}
      </Panel>
    </>
  );
}

function StorySummaryItem({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="glass flex min-h-[64px] items-center gap-3 rounded-lg px-3 py-2">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--brand)]/35 bg-[var(--brand)]/10 text-[var(--brand)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-foreground/90">{label}</p>
        <p className="mt-0.5 text-lg font-extrabold text-foreground" dir="ltr">
          {value} {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
        </p>
      </div>
    </div>
  );
}
