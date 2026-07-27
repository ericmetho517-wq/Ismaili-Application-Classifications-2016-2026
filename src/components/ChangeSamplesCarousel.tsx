import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Building2, Droplets, Factory, MapPinned, Sprout } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Feature, Geometry, Position } from "geojson";
import type { AnyFC, LayerKey } from "@/lib/data";
import { loadLayer } from "@/lib/data";
import { canonicalUse, colorFor } from "@/lib/colors";
import { useI18n, formatNum } from "@/lib/i18n";
import { translateValue } from "@/lib/labels";
import { MapViewClient } from "@/components/MapViewClient";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type SampleKind = "urban" | "agri" | "industrial" | "water";
type SampleFilter = "all" | SampleKind;

type SampleConfig = {
  kind: SampleKind;
  layerKey: LayerKey;
  categoryRawName: string;
  count: number;
  icon: LucideIcon;
  color: string;
};

type ChangeSample = {
  id: string;
  index: number;
  kind: SampleKind;
  layerKey: LayerKey;
  categoryRawName: string;
  filterValue: string;
  title: string;
  detail: string;
  axis: string;
  areaKm2: number;
  bounds: [[number, number], [number, number]];
  color: string;
  icon: LucideIcon;
};

type FeatureProps = Record<string, unknown>;

const SAMPLE_CONFIGS: SampleConfig[] = [
  {
    kind: "urban",
    layerKey: "Urban_Changes",
    categoryRawName: "حضري / عمراني",
    count: 10,
    icon: Building2,
    color: "#ef4444",
  },
  {
    kind: "agri",
    layerKey: "Agricultural_Changes",
    categoryRawName: "زراعي",
    count: 12,
    icon: Sprout,
    color: "#22c55e",
  },
  {
    kind: "industrial",
    layerKey: "Industrial_Changes",
    categoryRawName: "صناعي",
    count: 4,
    icon: Factory,
    color: "#a855f7",
  },
  {
    kind: "water",
    layerKey: "Water_Changes",
    categoryRawName: "مياه",
    count: 4,
    icon: Droplets,
    color: "#3b82f6",
  },
];

const AREA_KEYS = ["مساحة_التغير_كم2", "المساحة_كم2", "مساحة_كم2", "مساحة_المنطقة_كم2"];

export function ChangeSamplesCarousel() {
  const { t, lang, dir } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [kindFilter, setKindFilter] = useState<SampleFilter>("all");
  const [valueFilter, setValueFilter] = useState("all");
  const { data, isLoading } = useQuery({
    queryKey: ["change-samples-layers"],
    queryFn: async () => {
      const entries = await Promise.all(
        SAMPLE_CONFIGS.map(
          async (config) => [config.layerKey, await loadLayer(config.layerKey)] as const,
        ),
      );
      return Object.fromEntries(entries) as Partial<Record<LayerKey, AnyFC>>;
    },
  });

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

  const samples = useMemo(() => buildSamples(data ?? {}), [data]);
  const valueOptions = useMemo(() => {
    if (kindFilter !== "urban" && kindFilter !== "agri") return [];
    return [...new Set(samples.filter((sample) => sample.kind === kindFilter).map((sample) => sample.filterValue))]
      .filter((value) => value !== "-")
      .sort((a, b) => a.localeCompare(b, lang));
  }, [kindFilter, lang, samples]);
  const filteredSamples = useMemo(
    () => samples.filter((sample) => {
      if (kindFilter !== "all" && sample.kind !== kindFilter) return false;
      return valueFilter === "all" || sample.filterValue === valueFilter;
    }),
    [kindFilter, samples, valueFilter],
  );

  useEffect(() => {
    if (!api) return;
    api.reInit();
    api.scrollTo(0, true);
    setActiveIndex(0);
  }, [api, kindFilter, valueFilter, filteredSamples.length]);

  if (isLoading) {
    return (
      <div className="flex min-h-[560px] items-center justify-center text-sm text-muted-foreground">
        {t.common.loading}
      </div>
    );
  }

  if (!samples.length) {
    return (
      <div className="flex min-h-[560px] items-center justify-center text-sm text-muted-foreground">
        {t.common.noData}
      </div>
    );
  }

  return (
    <Carousel opts={{ align: "start", direction: dir }} setApi={setApi} dir={dir} className="pb-16">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t.changeSamples.changeType}>
        {(["all", "urban", "agri", "industrial", "water"] as SampleFilter[]).map((filter) => {
          const label = filter === "all" ? t.filters.all : t.changeSamples.kinds[filter];
          const count = filter === "all" ? samples.length : samples.filter((sample) => sample.kind === filter).length;
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={kindFilter === filter}
              onClick={() => {
                setKindFilter(filter);
                setValueFilter("all");
                setActiveIndex(0);
              }}
              className={`rounded-full border px-3.5 py-2 text-xs font-extrabold transition-all ${
                kindFilter === filter
                  ? "border-[var(--brand)] bg-[var(--brand)] text-white shadow-md"
                  : "border-border bg-background/75 text-muted-foreground hover:border-[var(--brand)]/60 hover:text-foreground"
              }`}
            >
              {label} <bdi className="ms-1 opacity-80">({count})</bdi>
            </button>
          );
        })}
      </div>
      {valueOptions.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-foreground/[0.025] p-2">
          {["all", ...valueOptions].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={valueFilter === value}
              onClick={() => {
                setValueFilter(value);
                setActiveIndex(0);
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors ${
                valueFilter === value
                  ? "bg-foreground text-background shadow-sm"
                  : "bg-background/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {value === "all"
                ? lang === "ar" ? "كل القيم" : "All values"
                : translateValue(value, lang)}
            </button>
          ))}
        </div>
      )}
      <CarouselContent className="-ml-2">
        {filteredSamples.map((sample, index) => {
          const active = activeIndex === index;
          const Icon = sample.icon;
          const syncGroup = `change-sample-${sample.id}`;
          const kindLabel = t.changeSamples.kinds[sample.kind];

          return (
            <CarouselItem key={sample.id} className="pl-2">
              <section className="min-h-[650px] rounded-lg border border-border/70 bg-background/25 p-3 lg:min-h-[610px]">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {t.changeSamples.sampleLabel} {index + 1} / {filteredSamples.length}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold leading-tight text-foreground">
                      {kindLabel} - {translateValue(sample.title, lang)}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {translateValue(sample.detail, lang)}
                    </p>
                  </div>
                  <div
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border bg-foreground/5"
                    style={{ borderColor: `${sample.color}80`, color: sample.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                <div className="mb-3 grid gap-2 md:grid-cols-3">
                  <SampleMetric label={t.changeSamples.changeType} value={kindLabel} />
                  <SampleMetric
                    label={t.common.area}
                    value={`${formatNum(sample.areaKm2, lang, 4)} ${t.stats.km2}`}
                    ltr
                  />
                  <SampleMetric label={t.filters.axis} value={translateValue(sample.axis, lang)} />
                </div>

                <div className="grid min-h-0 gap-2 lg:grid-cols-2">
                  <SampleMap
                    active={active}
                    yearTitle={t.map.year2016}
                    layerKey="Land_Cover2016"
                    layerLabel={t.layers.land_2016}
                    sample={sample}
                    syncGroup={syncGroup}
                  />
                  <SampleMap
                    active={active}
                    yearTitle={t.map.year2026}
                    layerKey="Land_Cover2026"
                    layerLabel={t.layers.land_2026}
                    sample={sample}
                    syncGroup={syncGroup}
                  />
                </div>
              </section>
            </CarouselItem>
          );
        })}
      </CarouselContent>

      <CarouselPrevious
        aria-label={t.changeSamples.previous}
        title={t.changeSamples.previous}
        className="z-20 h-12 w-12 !translate-y-0 border-2 border-[var(--brand)] bg-background text-[var(--brand)] shadow-xl ring-4 ring-background/70 hover:scale-110 hover:bg-[var(--brand)] hover:text-white [&>svg]:!h-6 [&>svg]:!w-6"
        style={{ top: "auto", bottom: 0, left: "calc(50% - 3.5rem)" }}
      />
      <CarouselNext
        aria-label={t.changeSamples.next}
        title={t.changeSamples.next}
        className="z-20 h-12 w-12 !translate-y-0 border-2 border-[var(--brand)] bg-background text-[var(--brand)] shadow-xl ring-4 ring-background/70 hover:scale-110 hover:bg-[var(--brand)] hover:text-white [&>svg]:!h-6 [&>svg]:!w-6"
        style={{ top: "auto", bottom: 0, right: "calc(50% - 3.5rem)" }}
      />

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {filteredSamples.map((sample, index) => (
          <button
            key={sample.id}
            type="button"
            aria-label={`${t.changeSamples.sampleLabel} ${index + 1}`}
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

export function ChangeSamplesSummary() {
  const { t } = useI18n();
  return (
    <div className="mb-2 grid gap-2 md:grid-cols-3">
      <SummaryBox
        icon={<MapPinned className="h-4 w-4" />}
        label={t.changeSamples.totalSamples}
        value={String(SAMPLE_CONFIGS.reduce((sum, config) => sum + config.count, 0))}
      />
      <SummaryBox
        icon={<ArrowLeftRight className="h-4 w-4" />}
        label={t.changeSamples.mode}
        value="2016 / 2026"
      />
      <SummaryBox
        icon={<Building2 className="h-4 w-4" />}
        label={t.changeSamples.sampleMix}
        value={t.changeSamples.mixValue}
      />
    </div>
  );
}

function SampleMap({
  active,
  yearTitle,
  layerKey,
  layerLabel,
  sample,
  syncGroup,
}: {
  active: boolean;
  yearTitle: string;
  layerKey: "Land_Cover2016" | "Land_Cover2026";
  layerLabel: string;
  sample: ChangeSample;
  syncGroup: string;
}) {
  const { t } = useI18n();

  return (
    <div className="min-h-[380px] rounded-lg border border-border/70 bg-foreground/[0.03] p-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black text-foreground">{yearTitle}</h3>
          <p className="text-[10px] text-muted-foreground">{layerLabel}</p>
        </div>
        <span className="rounded-md border border-border bg-background/75 px-2 py-1 text-[10px] font-semibold text-foreground shadow-sm backdrop-blur">
          {t.changeSamples.closeZoom}
        </span>
      </div>
      {active ? (
        <MapViewClient
          key={`${sample.id}-${layerKey}`}
          height="clamp(280px, 48dvh, 470px)"
          initialBasemap="satellite"
          satelliteVintage={layerKey === "Land_Cover2016" ? "2016" : "latest"}
          initialBounds={sample.bounds}
          fitBoundsOnChangeKey={sample.id}
          syncGroup={syncGroup}
          showLayerControl={false}
          showTransit={false}
          filterFn={(key, props) => sampleFilter(sample, key, props)}
          layers={[
            {
              key: layerKey,
              label: layerLabel,
              type: "polygon",
              styleBy: "use",
              fillOpacity: 0.52,
            },
            {
              key: sample.layerKey,
              label: t.changeSamples.sampleBoundary,
              type: "polygon",
              fixedColor: "#ffffff",
              weight: 3,
              opacity: 1,
              outlineOnly: true,
            },
          ]}
          initialActive={[layerKey, sample.layerKey]}
        />
      ) : (
        <div className="glass flex min-h-[330px] items-center justify-center rounded-xl text-xs text-muted-foreground">
          {t.changeSamples.mapWaiting}
        </div>
      )}
    </div>
  );
}

function SampleMetric({
  label,
  value,
  ltr = false,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-foreground/[0.03] p-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p
        className="mt-1 truncate text-sm font-extrabold text-foreground"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass flex min-h-[64px] items-center gap-3 rounded-lg px-3 py-2">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[var(--brand)]/35 bg-[var(--brand)]/10 text-[var(--brand)]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-extrabold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function buildSamples(layers: Partial<Record<LayerKey, AnyFC>>): ChangeSample[] {
  let index = 0;
  return SAMPLE_CONFIGS.flatMap((config) => {
    const fc = layers[config.layerKey];
    if (!fc) return [];

    const candidates = [...fc.features]
      .filter((feature) => geometryBounds(feature.geometry))
      .sort((a, b) => featureAreaKm2(b) - featureAreaKm2(a));

    return selectDiverseFeatures(candidates, config.kind, config.count)
      .map((feature) => {
        index += 1;
        const props: FeatureProps = feature.properties ?? {};
        const areaKm2 = featureAreaKm2(feature);
        return {
          id: `${config.layerKey}-${String(props.GlobalID ?? index)}`,
          index,
          kind: config.kind,
          layerKey: config.layerKey,
          categoryRawName: config.categoryRawName,
          filterValue: sampleCategoryValue(config.kind, props),
          title: sampleTitle(config.kind, props),
          detail: sampleDetail(config.kind, props),
          axis: axisName(props["اسم_المحور"]),
          areaKm2,
          bounds: paddedBounds(geometryBounds(feature.geometry)!),
          color: config.color,
          icon: config.icon,
        };
      });
  });
}

function selectDiverseFeatures(
  features: Array<Feature<Geometry, FeatureProps>>,
  kind: SampleKind,
  count: number,
) {
  const groups = new Map<string, Array<Feature<Geometry, FeatureProps>>>();
  features.forEach((feature) => {
    const value = sampleCategoryValue(kind, feature.properties ?? {});
    const group = groups.get(value) ?? [];
    group.push(feature);
    groups.set(value, group);
  });

  const selected: Array<Feature<Geometry, FeatureProps>> = [];
  const queues = [...groups.values()];
  while (selected.length < count && queues.some((queue) => queue.length)) {
    queues.forEach((queue) => {
      if (selected.length < count && queue.length) selected.push(queue.shift()!);
    });
  }
  return selected;
}

function sampleCategoryValue(kind: SampleKind, props: FeatureProps) {
  if (kind === "water") return cleanValue(props["اسم_المسطح"]);
  return cleanValue(props["وصف_الاستخدام"] ?? props["نمط_العمران"]);
}

function sampleFilter(sample: ChangeSample, key: LayerKey, props: FeatureProps) {
  if (key === sample.layerKey) {
    return String(props.GlobalID ?? "") === sample.id.replace(`${sample.layerKey}-`, "");
  }
  if (key === "Land_Cover2016" || key === "Land_Cover2026") {
    return (
      canonicalUse(props["وصف_الاستخدام"] ?? props["استخدام_الأرض"]) ===
      canonicalUse(sample.categoryRawName)
    );
  }
  return true;
}

function featureAreaKm2(
  feature: Feature<Geometry, FeatureProps> | { properties?: FeatureProps | null },
) {
  const props = feature.properties ?? {};
  for (const key of AREA_KEYS) {
    const value = Number(props[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const shapeArea = Number(props.SHAPE_Area ?? props.Shape_Area);
  if (Number.isFinite(shapeArea) && shapeArea > 0) return shapeArea / 1_000_000;
  return 0;
}

function sampleTitle(kind: SampleKind, props: FeatureProps) {
  if (kind === "water") return cleanValue(props["اسم_المسطح"]);
  if (kind === "agri")
    return cleanValue(props["وصف_الاستخدام"] ?? props["أنواع_المحاصيل_المزروعة"]);
  return cleanValue(props["وصف_الاستخدام"] ?? props["نمط_العمران"]);
}

function sampleDetail(kind: SampleKind, props: FeatureProps) {
  if (kind === "agri") {
    return cleanValue(
      props["أنواع_المحاصيل_المزروعة"] ?? props["نوع_ملكية_الأرض"] ?? props["وصف_الاستخدام"],
    );
  }
  if (kind === "urban") return cleanValue(props["نمط_العمران"] ?? props["وصف_الاستخدام"]);
  if (kind === "water") return cleanValue(props["اسم_المسطح"]);
  return cleanValue(props["وصف_الاستخدام"] ?? props["نمط_العمران"]);
}

function cleanValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text || text === "null" || text === "undefined") return "-";
  return text;
}

function axisName(value: unknown) {
  const text = cleanValue(value);
  return text === "-" ? "-" : "الإسماعيلية";
}

function geometryBounds(geometry: Geometry | null): [[number, number], [number, number]] | null {
  const coords = geometryPositions(geometry);
  if (!coords.length) return null;

  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  for (const position of coords) {
    const [lng, lat] = position;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return null;
  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}

function paddedBounds(
  bounds: [[number, number], [number, number]],
): [[number, number], [number, number]] {
  const [[south, west], [north, east]] = bounds;
  const latPad = Math.max((north - south) * 0.75, 0.0025);
  const lngPad = Math.max((east - west) * 0.75, 0.0025);
  return [
    [south - latPad, west - lngPad],
    [north + latPad, east + lngPad],
  ];
}

function geometryPositions(geometry: Geometry | null): Position[] {
  if (!geometry) return [];
  if (geometry.type === "Point") return [geometry.coordinates];
  if (geometry.type === "MultiPoint" || geometry.type === "LineString") return geometry.coordinates;
  if (geometry.type === "MultiLineString" || geometry.type === "Polygon") {
    return geometry.coordinates.flat();
  }
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat(2);
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap((item) => geometryPositions(item));
  }
  return [];
}
