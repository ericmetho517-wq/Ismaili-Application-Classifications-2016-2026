import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Droplets,
  Factory,
  Landmark,
  Mountain,
  Sprout,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Summary } from "@/lib/data";
import { pickArea } from "@/lib/data";
import { colorFor, labelFor } from "@/lib/colors";
import { useI18n, formatNum } from "@/lib/i18n";
import { MapViewClient } from "@/components/MapViewClient";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { applyMapFilter, landUseFilter } from "@/lib/mapFilters";

type StoryKey = "urban" | "agri" | "industrial" | "vacant" | "water" | "military";

type StorySlide = {
  key: StoryKey;
  rawName: string;
  icon: LucideIcon;
  invert?: boolean;
};

const STORY_SLIDES: StorySlide[] = [
  { key: "urban", rawName: "حضري / عمراني", icon: Building2 },
  { key: "agri", rawName: "زراعي", icon: Sprout },
  { key: "industrial", rawName: "صناعي", icon: Factory },
  { key: "vacant", rawName: "ارض فضاء", icon: Mountain, invert: true },
  { key: "water", rawName: "مياه", icon: Droplets, invert: true },
  { key: "military", rawName: "منطقة عسكرية", icon: Landmark, invert: true },
];

export function ChangeStoryCarousel({ summary }: { summary: Summary }) {
  const { t, lang, dir } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setActiveIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  const slides = useMemo(() => {
    const values = STORY_SLIDES.map((slide) => {
      const v2016 = pickArea(summary.land_cover_2016, slide.rawName);
      const v2026 = pickArea(summary.land_cover_2026, slide.rawName);
      const delta = v2026 - v2016;
      const pct = v2016 > 0 ? (delta / v2016) * 100 : v2026 > 0 ? 100 : 0;
      return { ...slide, v2016, v2026, delta, pct };
    });

    const maxValue = Math.max(...values.flatMap((slide) => [slide.v2016, slide.v2026]), 1);
    return values.map((slide) => ({ ...slide, maxValue }));
  }, [summary]);

  return (
    <Carousel
      opts={{ align: "start", direction: dir }}
      setApi={setApi}
      className="relative min-h-0 pb-16"
      dir={dir}
    >
      <CarouselContent className="-ms-2">
        {slides.map((slide, index) => {
          const copy = t.story.slides[slide.key];
          const Icon = slide.icon;
          const color = colorFor(slide.rawName);
          const label = labelFor(slide.rawName, lang);
          const positive = slide.delta > 0;
          const good = slide.invert ? slide.delta < 0 : slide.delta > 0;
          const ToneIcon = positive ? ArrowUpRight : ArrowDownRight;
          const tone = good ? "text-emerald-400" : "text-rose-400";
          const active = activeIndex === index;
          const filter = landUseFilter(label, ["Land_Cover2016", "Land_Cover2026"], slide.rawName);
          const syncGroup = `story-${slide.key}`;
          const pctLabel = `${slide.pct >= 0 ? "+" : ""}${formatNum(slide.pct, lang, 1)}%`;
          const deltaLabel = `${slide.delta >= 0 ? "+" : ""}${formatNum(slide.delta, lang)} ${t.stats.km2}`;

          return (
            <CarouselItem key={slide.key} className="ps-2">
              <section className="min-h-[620px] rounded-lg border border-border/70 bg-background/25 p-3 lg:min-h-[560px]">
                <div className="grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {copy.eyebrow}
                        </p>
                        <h2 className="mt-1 text-xl font-extrabold leading-tight text-foreground">
                          {copy.title}
                        </h2>
                      </div>
                      <div
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border bg-foreground/5"
                        style={{ borderColor: `${color}80`, color }}
                        title={label}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-muted-foreground">{copy.body}</p>

                    <div className="grid grid-cols-2 gap-2">
                      <MetricBox label={t.map.year2016} value={slide.v2016} />
                      <MetricBox label={t.map.year2026} value={slide.v2026} strong />
                    </div>

                    <div className="rounded-lg border border-border/70 bg-foreground/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {t.story.netChange}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-sm font-extrabold ${tone}`}
                        >
                          <ToneIcon className="h-4 w-4" />
                          {pctLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-lg font-extrabold text-foreground" dir="ltr">
                        {deltaLabel}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-muted-foreground">{copy.impact}</p>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-foreground/[0.03] p-3">
                      <ComparisonBar
                        label={t.map.year2016}
                        value={slide.v2016}
                        max={slide.maxValue}
                        color={color}
                      />
                      <ComparisonBar
                        label={t.map.year2026}
                        value={slide.v2026}
                        max={slide.maxValue}
                        color={color}
                        emphasis
                      />
                    </div>
                  </div>

                  <div className="grid min-h-0 gap-2 md:grid-cols-2">
                    <StoryMap
                      active={active}
                      title={t.map.year2016}
                      layerKey="Land_Cover2016"
                      layerLabel={t.layers.land_2016}
                      filter={filter}
                      placeholder={t.story.mapWaiting}
                      syncGroup={syncGroup}
                    />
                    <StoryMap
                      active={active}
                      title={t.map.year2026}
                      layerKey="Land_Cover2026"
                      layerLabel={t.layers.land_2026}
                      filter={filter}
                      placeholder={t.story.mapWaiting}
                      syncGroup={syncGroup}
                    />
                  </div>
                </div>
              </section>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <CarouselPrevious
        aria-label={t.story.previous}
        title={t.story.previous}
        className="z-20 h-12 w-12 !translate-y-0 border-2 border-[var(--brand)] bg-background text-[var(--brand)] shadow-xl ring-4 ring-background/70 hover:scale-110 hover:bg-[var(--brand)] hover:text-white [&>svg]:!h-6 [&>svg]:!w-6"
        style={{ top: "auto", bottom: 0, left: "calc(50% - 3.5rem)" }}
      />
      <CarouselNext
        aria-label={t.story.next}
        title={t.story.next}
        className="z-20 h-12 w-12 !translate-y-0 border-2 border-[var(--brand)] bg-background text-[var(--brand)] shadow-xl ring-4 ring-background/70 hover:scale-110 hover:bg-[var(--brand)] hover:text-white [&>svg]:!h-6 [&>svg]:!w-6"
        style={{ top: "auto", bottom: 0, right: "calc(50% - 3.5rem)" }}
      />

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`${t.story.activeSlide} ${index + 1}`}
            onClick={() => api?.scrollTo(index)}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index
                ? "w-7 bg-[var(--brand)]"
                : "w-2 bg-foreground/25 hover:bg-foreground/45"
            }`}
          />
        ))}
      </div>
    </Carousel>
  );
}

function MetricBox({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  const { lang, t } = useI18n();
  return (
    <div className="rounded-lg border border-border/70 bg-foreground/[0.03] p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 font-extrabold text-foreground ${strong ? "text-2xl" : "text-xl"}`}>
        {formatNum(value, lang)}
      </p>
      <p className="text-[10px] text-muted-foreground">{t.stats.km2}</p>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  max,
  color,
  emphasis = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  emphasis?: boolean;
}) {
  const { lang, t } = useI18n();
  const width = `${Math.max(3, (value / max) * 100)}%`;
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground" dir="ltr">
          {formatNum(value, lang)} {t.stats.km2}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={`h-full rounded-full ${emphasis ? "opacity-100" : "opacity-60"}`}
          style={{ width, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StoryMap({
  active,
  title,
  layerKey,
  layerLabel,
  filter,
  placeholder,
  syncGroup,
}: {
  active: boolean;
  title: string;
  layerKey: "Land_Cover2016" | "Land_Cover2026";
  layerLabel: string;
  filter: ReturnType<typeof landUseFilter>;
  placeholder: string;
  syncGroup: string;
}) {
  return (
    <div className="min-h-[260px] rounded-lg border border-border/70 bg-foreground/[0.03] p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-base font-extrabold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">{layerLabel}</span>
      </div>
      {active ? (
        <MapViewClient
          key={`${layerKey}-${filter.label}`}
          height="clamp(230px, 36dvh, 330px)"
          initialBasemap="satellite"
          satelliteVintage={layerKey === "Land_Cover2016" ? "2016" : "latest"}
          filterFn={applyMapFilter(filter)}
          syncGroup={syncGroup}
          showLayerControl={false}
          showTransit={false}
          layers={[
            {
              key: "Study_Area_Sector",
              label: "Study area",
              type: "boundary",
              fixedColor: "#073b88",
              fillColor: "#ffe7a3",
              dashArray: "8 6",
              fillOpacity: 0.16,
            },
            {
              key: "Axis_Road_Sector",
              label: "Axis road",
              type: "line",
              fixedColor: "#e31a1c",
              weight: 3,
            },
            { key: layerKey, label: layerLabel, type: "polygon", styleBy: "use" },
          ]}
          initialActive={["Study_Area_Sector", "Axis_Road_Sector", layerKey]}
        />
      ) : (
        <div className="glass flex min-h-[230px] items-center justify-center rounded-xl text-xs text-muted-foreground">
          {placeholder}
        </div>
      )}
    </div>
  );
}
