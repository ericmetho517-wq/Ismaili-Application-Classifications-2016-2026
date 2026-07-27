import { useEffect, useMemo, useRef, useState } from "react";
import type { AnyFC, LayerKey } from "@/lib/data";
import { loadMapLayer } from "@/lib/data";
import { colorFor, labelFor, changeColor, changeLabel } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { translateFieldLabel, translateValue } from "@/lib/labels";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Maximize2, Map as MapIcon } from "lucide-react";

type LayerSpec = {
  key: LayerKey;
  label: string;
  type: "polygon" | "line" | "boundary" | "point";
  styleBy?: "use" | "change" | "fixed" | "price2016" | "price2026" | "priceGrowth";
  fixedColor?: string;
  weight?: number;
  radius?: number;
  pointShape?: "circle" | "firefly" | "metro";
  opacity?: number;
  fillOpacity?: number;
  outlineOnly?: boolean;
  interactive?: boolean;
};

type Basemap = "blue" | "streets" | "satellite" | "dark";

const BASEMAPS: Record<Basemap, { url: string; attribution: string; className?: string }> = {
  blue: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap © CARTO",
    className: "corporate-blue-basemap",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap © CARTO",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap contributors",
  },
};

const SATELLITE_2016 = {
  url: "https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/18966/{z}/{y}/{x}",
  attribution: "World Imagery (Wayback 2016-12-20) © Esri",
};

export type MapViewProps = {
  layers: LayerSpec[];
  initialActive?: LayerKey[];
  showLayerControl?: boolean;
  showLegend?: boolean;
  showTransit?: boolean;
  defaultLayerControlOpen?: boolean;
  defaultLegendOpen?: boolean;
  legendItems?: Array<{ color: string; label: string }>;
  legendTitle?: string;
  legendHint?: string;
  legendType?: "list" | "gradient";
  height?: string;
  filterFn?: (key: LayerKey, props: Record<string, any>) => boolean;
  syncGroup?: string;
  initialBounds?: [[number, number], [number, number]];
  initialBasemap?: Basemap;
  satelliteVintage?: "2016" | "latest";
  fitBoundsOnChangeKey?: string;
  styleChangeKey?: string;
};

const syncedMapGroups: Record<string, Set<any>> = {};
const orderedLayerCache = new WeakMap<AnyFC, AnyFC>();
const LARGE_LAYER_BATCH_SIZE = 750;
const TRANSIT_LAYER_KEYS: LayerKey[] = ["LRT_Line", "lRT_Station", "Metro_Line", "Metro_Station"];
const STATION_NAME_FIELD = "\u0627\u0633\u0645_\u0627\u0644\u0645\u062d\u0637\u0629";

function isTransitLayer(key: LayerKey) {
  return TRANSIT_LAYER_KEYS.includes(key);
}

function stationColor(index: number, key: LayerKey) {
  const sequenceIndex = index * 2 + (key === "Metro_Station" ? 1 : 0);
  const hue = (sequenceIndex * 137.50776405) % 360;
  return `hsl(${hue.toFixed(2)} 78% 46%)`;
}

const MULTICOLOR_STATIONS =
  "conic-gradient(#ef4444, #f59e0b, #22c55e, #0ea5e9, #8b5cf6, #ec4899, #ef4444)";

const PRICE_2016_FIELD = "سعر_الأرض_2016";
const PRICE_2026_FIELD = "سعر_الأرض_2026";

function unitLandPrice(props: Record<string, any>, year: 2016 | 2026) {
  const total = Number(props[year === 2016 ? PRICE_2016_FIELD : PRICE_2026_FIELD] ?? 0);
  const area = Number(props.SHAPE_Area ?? props.Shape_Area ?? 0);
  return total > 0 && area > 0 ? total / area : 0;
}

function priceColor(props: Record<string, any>, mode: "price2016" | "price2026" | "priceGrowth") {
  const oldPrice = unitLandPrice(props, 2016);
  const newPrice = unitLandPrice(props, 2026);
  const value = mode === "priceGrowth" ? (oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 0) : mode === "price2016" ? oldPrice : newPrice;
  const breaks = mode === "priceGrowth" ? [100, 300, 700, 1200, 1800] : [500, 2000, 5000, 10000, 20000];
  const colors = ["#dceffc", "#a9d7f2", "#6bbce7", "#2f98d0", "#176cae", "#0b315f"];
  const index = breaks.findIndex((limit) => value < limit);
  return colors[index < 0 ? colors.length - 1 : index];
}

function registerSyncedMap(group: string, map: any) {
  syncedMapGroups[group] ??= new Set();
  const peers = syncedMapGroups[group];
  const firstPeer = peers.values().next().value;
  peers.add(map);

  if (firstPeer) {
    map._dashboardSyncing = true;
    map.setView(firstPeer.getCenter(), firstPeer.getZoom(), { animate: false });
    window.setTimeout(() => {
      map._dashboardSyncing = false;
    }, 0);
  }

  const syncPeers = () => {
    if (map._dashboardSyncing) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    peers.forEach((peer) => {
      if (peer === map) return;
      if (peer.getZoom() === zoom && peer.getCenter().distanceTo(center) < 1) return;
      peer._dashboardSyncing = true;
      peer.setView(center, zoom, { animate: false });
      window.setTimeout(() => {
        peer._dashboardSyncing = false;
      }, 0);
    });
  };

  map.on("moveend zoomend", syncPeers);
  return () => {
    map.off("moveend zoomend", syncPeers);
    peers.delete(map);
    if (peers.size === 0) delete syncedMapGroups[group];
  };
}

function getFeatureAreaKm2(feature: any) {
  const p = feature?.properties || {};
  return Number(
    p["مساحة_كم2"] ?? p["المساحة_كم2"] ?? p["مساحة_التغير_كم2"] ?? p["مساحة_المنطقة_كم2"] ?? 0,
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatValue(value: unknown, digits = 3) {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(n) && String(value).trim?.() !== "") {
    const isArabic = typeof document !== "undefined" && document.documentElement.lang === "ar";
    return n.toLocaleString(isArabic ? "ar-EG-u-nu-arab" : "en-US-u-nu-latn", {
      maximumFractionDigits: digits,
    });
  }
  return String(value);
}

function formatPopupValue(label: unknown, value: unknown) {
  const text = repairText(formatValue(value, 4));
  if (String(label).toLowerCase().includes("global") && text.length > 18) {
    return `${text.slice(0, 8)}...${text.slice(-8)}`;
  }
  return text;
}

function repairText(value: unknown) {
  const text = String(value ?? "");
  if (!/[ÃØÙ]/.test(text)) return text;
  try {
    const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[\u0600-\u06ff]/.test(decoded) ? decoded : text;
  } catch {
    return text;
  }
}

function formatFieldName(key: string, lang: "ar" | "en") {
  const known: Record<string, { ar: string; en: string }> = {
    OBJECTID: { ar: "رقم العنصر", en: "Object ID" },
    SHAPE_Length: { ar: "طول الشكل", en: "Shape length" },
    Shape_Length: { ar: "طول الشكل", en: "Shape length" },
    SHAPE_Area: { ar: "مساحة الشكل", en: "Shape area" },
    Shape_Area: { ar: "مساحة الشكل", en: "Shape area" },
  };
  const match = known[key];
  if (match) return lang === "ar" ? match.ar : match.en;
  return translateFieldLabel(repairText(key), lang);
}

function isDisplayableValue(value: unknown) {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return Number.isFinite(value);
  const text = String(value).trim().toLowerCase();
  return text !== "" && text !== "null" && text !== "undefined" && text !== "nan";
}

function rowKey(label: unknown) {
  return String(label).replace(/\s+/g, " ").trim().toLowerCase();
}

const HIDDEN_POPUP_FIELDS = new Set([
  "استخدام_الأرض",
  "اسم_المحور",
  "اسم_القطاع",
  "globalid",
  "المحافظة",
]);

function isHiddenPopupField(key: string) {
  return HIDDEN_POPUP_FIELDS.has(repairText(key).trim().toLowerCase());
}

function popupLabel(key: string, lang: "ar" | "en", t: any) {
  const labels: Record<string, { ar: string; en: string }> = {
    وصف_الاستخدام: { ar: t.common.name, en: t.common.name },
    استخدام_الأرض: { ar: t.common.type, en: t.common.type },
    مساحة_كم2: { ar: t.common.area, en: t.common.area },
    المساحة_كم2: { ar: t.common.area, en: t.common.area },
    مساحة_التغير_كم2: { ar: "مساحة التغير", en: "Change area" },
    مساحة_المنطقة_كم2: { ar: t.common.area, en: t.common.area },
    المساحة_فدان: { ar: "المساحة بالفدان", en: "Area in feddans" },
    حالة_التغير: { ar: t.filters.changeStatus, en: t.filters.changeStatus },
    نمط_العمران: { ar: "نمط العمران", en: "Urban pattern" },
    نوع_ملكية_الأرض: { ar: "ملكية الأرض", en: "Land ownership" },
    أنواع_المحاصيل_المزروعة: { ar: "المحاصيل", en: "Crops" },
    اسم_المسطح: { ar: t.common.name, en: t.common.name },
    مساحة_التغير_بالمتر: { ar: "مساحة التغير بالمتر", en: "Change area (m²)" },
    SHAPE_Length: { ar: "الطول", en: "Length" },
    Shape_Length: { ar: "الطول", en: "Length" },
  };
  const label = labels[key];
  return label ? label[lang] : formatFieldName(key, lang);
}

function popupValue(key: string, value: unknown, lang: "ar" | "en", t: any) {
  if (key === "وصف_الاستخدام") return translateValue(repairText(value), lang);
  if (key === "استخدام_الأرض") return labelFor(value as any, lang);
  if (key === "حالة_التغير") return changeLabel(value as any, lang);
  if (
    key === "مساحة_كم2" ||
    key === "المساحة_كم2" ||
    key === "مساحة_التغير_كم2" ||
    key === "مساحة_المنطقة_كم2"
  ) {
    return `${formatValue(value)} ${t.stats.km2}`;
  }
  if (key === "المساحة_فدان") return `${formatValue(value)} ${lang === "ar" ? "فدان" : "feddan"}`;
  if (key === "مساحة_التغير_بالمتر") return `${formatValue(value)} ${lang === "ar" ? "م²" : "m²"}`;
  if (key === "SHAPE_Length" || key === "Shape_Length") {
    return `${formatValue(Number(value) / 1000)} ${t.stats.km}`;
  }
  if (key === "SHAPE_Area" || key === "Shape_Area") {
    return `${formatValue(value)} ${lang === "ar" ? "م²" : "m²"}`;
  }
  if (key.includes("سعر") || key.includes("السعر")) {
    return `${formatValue(value, 2)} ${lang === "ar" ? "جنيه" : "EGP"}`;
  }
  if (key.startsWith("نسبة_")) {
    return `${formatValue(value, 2)}%`;
  }
  return translateValue(repairText(value), lang);
}

function geometryLabel(type: unknown, lang: "ar" | "en") {
  const labels: Record<string, { ar: string; en: string }> = {
    Point: { ar: "نقطة", en: "Point" },
    MultiPoint: { ar: "مجموعة نقاط", en: "Multi-point" },
    LineString: { ar: "خط", en: "Line" },
    MultiLineString: { ar: "مجموعة خطوط", en: "Multi-line" },
    Polygon: { ar: "مضلع", en: "Polygon" },
    MultiPolygon: { ar: "متعدد المضلعات", en: "Multi-polygon" },
  };
  const key = String(type ?? "");
  return labels[key]?.[lang] ?? key;
}

function popupFieldKeys(spec: LayerSpec) {
  if (spec.key === "Metro_Station" || spec.key === "lRT_Station") {
    return [STATION_NAME_FIELD];
  }
  if (spec.key === "Metro_Line" || spec.key === "LRT_Line") {
    return ["Shape_Length", "SHAPE_Length"];
  }
  if (spec.key === "Study_Area_Sector") {
    return ["مساحة_المنطقة_كم2", "Shape_Length", "SHAPE_Length"];
  }
  if (spec.key === "Land_Cover2016" || spec.key === "Land_Cover2026") {
    return [
      "وصف_الاستخدام",
      "استخدام_الأرض",
      "مساحة_كم2",
      "المساحة_فدان",
      "سعر_الأرض_2016",
      "سعر_الأرض_2026",
      "حالة_التغير",
    ];
  }
  if (spec.key === "Urban_Changes" || spec.key === "Industrial_Changes") {
    return ["وصف_الاستخدام", "نمط_العمران", "مساحة_التغير_كم2", "مساحة_التغير_بالمتر"];
  }
  if (spec.key === "Agricultural_Changes") {
    return [
      "وصف_الاستخدام",
      "نوع_ملكية_الأرض",
      "أنواع_المحاصيل_المزروعة",
      "المساحة_كم2",
      "المساحة_فدان",
    ];
  }
  if (spec.key === "Water_Changes") {
    return ["اسم_المسطح", "مساحة_كم2", "Shape_Length", "SHAPE_Length"];
  }
  return ["وصف_الاستخدام", "مساحة_كم2", "المساحة_كم2"];
}

function buildPopupHtml({
  feature,
  spec,
  lang,
  t,
  colorOverride,
}: {
  feature: any;
  spec: LayerSpec;
  lang: "ar" | "en";
  t: any;
  colorOverride?: string;
}) {
  const p = feature?.properties || {};
  const rawName = p["وصف_الاستخدام"];
  const waterName = p["اسم_المسطح"];
  const stationName = p[STATION_NAME_FIELD];
  const contextualName = stationName ?? waterName ?? rawName ?? p["اسم_المحور"] ?? p["اسم_القطاع"];
  const use = rawName ?? p["استخدام_الأرض"];
  const title =
    isDisplayableValue(contextualName)
      ? translateValue(repairText(contextualName), lang)
        : use
          ? labelFor(use, lang)
          : spec.label;
  const color =
    colorOverride ?? spec.fixedColor ?? (spec.styleBy === "change" ? changeColor(p["حالة_التغير"]) : colorFor(use));
  const priorityKeys = popupFieldKeys(spec);
  const detailKeys = [
    ...priorityKeys,
    ...Object.keys(p).filter((key) => !priorityKeys.includes(key)),
  ].filter((key) => !isHiddenPopupField(key));
  const rows: Array<[string, unknown]> = detailKeys
    .map((key) => [key, p[key]] as [string, unknown])
    .filter(([key, value], index, arr) => {
      if (!isDisplayableValue(value)) return false;
      return (
        arr.findIndex(
          ([candidate, candidateValue]) =>
            isDisplayableValue(candidateValue) && rowKey(candidate) === rowKey(key),
        ) === index
      );
    })
    .map(
      ([key, value]) =>
        [popupLabel(key, lang, t), popupValue(key, value, lang, t)] as [string, unknown],
    );

  if (spec.key === "Land_Cover2026") {
    const area = Number(p.SHAPE_Area ?? p.Shape_Area ?? 0);
    const price2016 = Number(p[PRICE_2016_FIELD] ?? 0);
    const price2026 = Number(p[PRICE_2026_FIELD] ?? 0);
    if (area > 0 && price2016 > 0) {
      rows.push([
        lang === "ar" ? "سعر المتر 2016" : "2016 unit price",
        `${formatValue(price2016 / area, 0)} ${lang === "ar" ? "جنيه/م²" : "EGP/m²"}`,
      ]);
    }
    if (area > 0 && price2026 > 0) {
      rows.push([
        lang === "ar" ? "سعر المتر 2026" : "2026 unit price",
        `${formatValue(price2026 / area, 0)} ${lang === "ar" ? "جنيه/م²" : "EGP/m²"}`,
      ]);
    }
  }

  const tableRows = rows
    .map(
      ([label, value]) => `
        <div class="gis-popup-row">
          <span>${escapeHtml(repairText(label))}</span>
          <strong title="${escapeHtml(repairText(formatValue(value, 4)))}">${escapeHtml(formatPopupValue(label, value))}</strong>
        </div>
      `,
    )
    .join("");

  return `
    <article class="gis-popup-card" dir="${lang === "ar" ? "rtl" : "ltr"}">
      <header class="gis-popup-header">
        <span class="gis-popup-swatch" style="background:${escapeHtml(color)}"></span>
        <div>
          <p>${escapeHtml(spec.label)}</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
      </header>
      <div class="gis-popup-meta">
        <span>${escapeHtml(lang === "ar" ? "نوع العنصر" : "Geometry")} <strong>${escapeHtml(geometryLabel(feature?.geometry?.type, lang))}</strong></span>
        <span>${escapeHtml(lang === "ar" ? "البيانات المتاحة" : "Available fields")} <strong>${rows.length}</strong></span>
      </div>
      <p class="gis-popup-section-title">${escapeHtml(lang === "ar" ? "تفاصيل العنصر" : "Feature details")}</p>
      <div class="gis-popup-grid">${tableRows}</div>
    </article>
  `;
}

function highlightFeatureLayer(lyr: any, spec: LayerSpec) {
  if (spec.type === "point") {
    lyr.setRadius?.((spec.radius ?? 7) + 2);
    lyr.setStyle?.({ color: "#ffffff", weight: 3, fillOpacity: 1, opacity: 1 });
  } else if (spec.type === "line") {
    lyr.setStyle?.({
      weight: Math.max((spec.weight ?? 3) + 3, 6),
      opacity: 1,
    });
  } else {
    lyr.setStyle?.({
      color: "#ffffff",
      weight: 2.4,
      opacity: 1,
      fillOpacity: Math.min((spec.fillOpacity ?? 0.62) + 0.16, 0.9),
    });
  }
  lyr.bringToFront?.();
}

function orderLandCoverForDisplay(fc: AnyFC, key: LayerKey): AnyFC {
  if (key !== "Land_Cover2016" && key !== "Land_Cover2026") return fc;
  const cached = orderedLayerCache.get(fc);
  if (cached) return cached;
  const ordered = {
    ...fc,
    features: [...fc.features].sort((a, b) => getFeatureAreaKm2(b) - getFeatureAreaKm2(a)),
  };
  orderedLayerCache.set(fc, ordered);
  return ordered;
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

export function MapView(props: MapViewProps) {
  const { lang, t, dir } = useI18n();
  const { theme } = useTheme();
  const layers = useMemo<LayerSpec[]>(() => {
    if (props.showTransit === false) return props.layers;
    const transit: LayerSpec[] = [
      { key: "LRT_Line", label: lang === "ar" ? "خط LRT" : "LRT Line", type: "line", fixedColor: "#d946ef", weight: 4, opacity: 1 },
      { key: "lRT_Station", label: lang === "ar" ? "محطات LRT" : "LRT Stations", type: "point", fixedColor: "#d946ef", radius: 5.5, pointShape: "firefly" },
      { key: "Metro_Line", label: lang === "ar" ? "خط المترو" : "Metro Line", type: "line", fixedColor: "#0284c7", weight: 4, opacity: 1 },
      { key: "Metro_Station", label: lang === "ar" ? "محطات المترو" : "Metro Stations", type: "point", fixedColor: "#0284c7", radius: 6.5, pointShape: "metro" },
    ];
    const existing = new Set(props.layers.map((layer) => layer.key));
    return [...props.layers, ...transit.filter((layer) => !existing.has(layer.key))];
  }, [lang, props.layers, props.showTransit]);
  const themeBasemap: Basemap = theme === "light" ? "blue" : "dark";
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Record<string, any>>({});
  const hitTargetsRef = useRef<Record<string, Array<{ layer: any; spec: LayerSpec }>>>({});
  const tileRef = useRef<any>(null);
  const syncCleanupRef = useRef<null | (() => void)>(null);
  const previousStyleKey = useRef(props.styleChangeKey);
  const [LRef, setLRef] = useState<any>(null);
  const [active, setActive] = useState<Set<string>>(
    new Set([
      ...(props.initialActive ?? props.layers.map((l) => l.key)),
      ...(props.showTransit === false ? [] : TRANSIT_LAYER_KEYS),
    ]),
  );
  const [basemap, setBasemap] = useState<Basemap>(props.initialBasemap ?? themeBasemap);
  const [openCtrl, setOpenCtrl] = useState(props.defaultLayerControlOpen ?? true);
  const [openLegend, setOpenLegend] = useState(props.defaultLegendOpen ?? true);
  const [openBasemap, setOpenBasemap] = useState(false);

  // Init map
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;
      setLRef(L);
      // Default Ismailia / east Egypt bbox roughly
      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
      }).setView([30.6, 32.0], 10);
      map.createPane("study-boundary").style.zIndex = "410";
      map.createPane("map-features").style.zIndex = "420";
      map.createPane("transit-lines").style.zIndex = "640";
      map.createPane("transit-stations").style.zIndex = "650";
      mapRef.current = map;

      // Canvas is considerably faster for the land-cover layers, but browsers can
      // occasionally miss a path click when tens of thousands of shapes share one
      // renderer.  Keep a lightweight list of rendered Leaflet paths and perform a
      // second hit-test on the map click so every visible feature remains selectable.
      map.on("click", (event: any) => {
        const point = map.latLngToLayerPoint(event.latlng);
        const keys = Object.keys(layerRefs.current).reverse();
        for (const key of keys) {
          const targets = hitTargetsRef.current[key] ?? [];
          for (let index = targets.length - 1; index >= 0; index -= 1) {
            const target = targets[index];
            const featureLayer = target.layer;
            if (featureLayer?._map !== map || !featureLayer.getPopup?.()) continue;

            let contains = false;
            if (typeof featureLayer._containsPoint === "function") {
              contains = featureLayer._containsPoint(point);
            } else if (typeof featureLayer.getLatLng === "function") {
              contains = map.latLngToLayerPoint(featureLayer.getLatLng()).distanceTo(point) <= 12;
            }
            if (!contains) continue;

            if (!featureLayer.isPopupOpen?.()) {
              highlightFeatureLayer(featureLayer, target.spec);
              featureLayer.openPopup(event.latlng);
            }
            return;
          }
        }
      });
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize({ pan: false });
      });
      resizeObserver.observe(mapEl.current);
      syncCleanupRef.current = props.syncGroup ? registerSyncedMap(props.syncGroup, map) : null;
      const initialBasemap = basemap;
      const initialBasemapConfig =
        initialBasemap === "satellite" && props.satelliteVintage === "2016"
          ? SATELLITE_2016
          : BASEMAPS[initialBasemap];
      tileRef.current = L.tileLayer(initialBasemapConfig.url, {
        attribution: initialBasemapConfig.attribution,
        className: "className" in initialBasemapConfig ? initialBasemapConfig.className : undefined,
        maxZoom: 19,
      }).addTo(map);

      if (props.initialBounds) {
        map.fitBounds(props.initialBounds, { padding: [18, 18], maxZoom: 17 });
      }

      // Fit to study area once loaded
      try {
        const fc = await loadMapLayer("Study_Area_Sector");
        const layer = L.geoJSON(fc as any, {
          interactive: false,
          style: {
            color: "#22d3ee",
            weight: 2,
            fillOpacity: 0.04,
            dashArray: "6 4",
          },
        }).addTo(map);
        if (!props.initialBounds) {
          const boundsLayer = fc.features.length
            ? layer
            : L.geoJSON((await loadMapLayer("Land_Cover2026")) as any);
          requestAnimationFrame(() => {
            if (cancelled) return;
            map.invalidateSize({ pan: false });
            const bounds = boundsLayer.getBounds();
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
          });
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        syncCleanupRef.current?.();
        syncCleanupRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (props.initialBasemap) return;
    setBasemap(themeBasemap);
  }, [props.initialBasemap, themeBasemap]);

  useEffect(() => {
    if (!mapRef.current || !props.initialBounds) return;
    mapRef.current.fitBounds(props.initialBounds, { padding: [18, 18], maxZoom: 17 });
  }, [props.fitBoundsOnChangeKey, props.initialBounds]);

  // Switch basemap
  useEffect(() => {
    if (!mapRef.current || !LRef || !tileRef.current) return;
    mapRef.current.removeLayer(tileRef.current);
    const basemapConfig =
      basemap === "satellite" && props.satelliteVintage === "2016"
        ? SATELLITE_2016
        : BASEMAPS[basemap];
    tileRef.current = LRef.tileLayer(basemapConfig.url, {
      attribution: basemapConfig.attribution,
      className: "className" in basemapConfig ? basemapConfig.className : undefined,
      maxZoom: 19,
    }).addTo(mapRef.current);
    tileRef.current.bringToBack();
  }, [basemap, LRef, props.satelliteVintage]);

  // Load + update layers when active set changes
  useEffect(() => {
    if (!mapRef.current || !LRef) return;
    let cancelled = false;
    const L = LRef;
    layers.forEach(async (spec) => {
      const id = spec.key;
      const isActive = active.has(id);
      if (!isActive) {
        if (layerRefs.current[id]) {
          mapRef.current.removeLayer(layerRefs.current[id]);
          layerRefs.current[id] = null;
        }
        hitTargetsRef.current[id] = [];
        return;
      }
      if (layerRefs.current[id]) return;
      try {
        const fc = await loadMapLayer(spec.key);
        if (cancelled || !mapRef.current) return;
        const displayFc = orderLandCoverForDisplay(fc, spec.key);
        const isLargeLandCover = spec.key === "Land_Cover2016" || spec.key === "Land_Cover2026";
        const allowInteraction = spec.interactive ?? true;
        const filtered = props.filterFn
          ? {
              ...displayFc,
              features: displayFc.features.filter((f) =>
                props.filterFn!(spec.key, f.properties || {}),
              ),
            }
          : displayFc;
        const stationColors = new WeakMap<object, string>();
        hitTargetsRef.current[id] = [];
        if (spec.type === "point") {
          filtered.features.forEach((feature, index) => {
            stationColors.set(feature, stationColor(index, spec.key));
          });
        }

        let layer: any;
        const layerOptions = {
          interactive: allowInteraction,
          pane:
            spec.type === "point"
              ? "transit-stations"
              : isTransitLayer(spec.key)
                ? "transit-lines"
                : spec.type === "boundary"
                  ? "study-boundary"
                  : "map-features",
          pointToLayer:
            spec.type === "point"
              ? (feature: any, latlng: any) => {
                  const featureColor = stationColors.get(feature) ?? spec.fixedColor ?? "#0ea5e9";
                  if (spec.pointShape === "firefly") {
                    const size = Math.max((spec.radius ?? 5.5) * 1.35, 7.5);
                    const hitSize = size + 12;
                    return L.marker(latlng, {
                      pane: "transit-stations",
                      icon: L.divIcon({
                        className: "transit-div-icon",
                        html: `<span class="transit-firefly-marker" style="width:${size}px;height:${size}px;--station-color:${featureColor}"></span>`,
                        iconSize: [hitSize, hitSize],
                        iconAnchor: [hitSize / 2, hitSize / 2],
                      }),
                    });
                  }
                  if (spec.pointShape === "metro") {
                    const size = (spec.radius ?? 6.5) * 2;
                    return L.marker(latlng, {
                      pane: "transit-stations",
                      icon: L.divIcon({
                        className: "transit-div-icon",
                        html: `<span class="transit-metro-marker" style="width:${size}px;height:${size}px;background:${featureColor}">M</span>`,
                        iconSize: [size, size],
                        iconAnchor: [size / 2, size / 2],
                      }),
                    });
                  }
                  return L.circleMarker(latlng, {
                    pane: "transit-stations",
                    radius: spec.radius ?? 5.5,
                    color: "#ffffff",
                    weight: 2,
                    fillColor: featureColor,
                    fillOpacity: 1,
                    opacity: 1,
                  });
                }
              : undefined,
          style: (feat: any) => {
            const p = feat?.properties || {};
            if (spec.type === "line") {
              return {
                color: spec.fixedColor ?? "#22d3ee",
                weight: spec.weight ?? 3,
                opacity: spec.opacity ?? 0.9,
              };
            }
            if (spec.type === "boundary") {
              return {
                color: spec.fixedColor ?? "#22d3ee",
                weight: 2,
                fill: false,
                fillOpacity: 0,
                dashArray: "6 4",
              };
            }
            let fill = spec.fixedColor ?? "#64748b";
            if (spec.styleBy === "use") fill = colorFor(p["وصف_الاستخدام"]);
            else if (spec.styleBy === "change") fill = changeColor(p["حالة_التغير"]);
            else if (spec.styleBy === "price2016" || spec.styleBy === "price2026" || spec.styleBy === "priceGrowth") {
              fill = priceColor(p, spec.styleBy);
            }
            if (spec.outlineOnly) {
              return {
                color: spec.fixedColor ?? "#ffffff",
                weight: spec.weight ?? 3,
                fillColor: fill,
                fillOpacity: 0,
                fillRule: "nonzero",
                opacity: spec.opacity ?? 1,
              };
            }
            return {
              color: fill,
              weight: spec.weight ?? 0.5,
              fillColor: fill,
              fillOpacity: spec.fillOpacity ?? 0.62,
              fillRule: "nonzero",
              opacity: 0.85,
            };
          },
          onEachFeature: (feat: any, lyr: any) => {
            if (!allowInteraction) return;
            const p = feat?.properties || {};
            const lines: string[] = [];
            const use = p["وصف_الاستخدام"];
            if (use) lines.push(`<b>${labelFor(use, lang)}</b>`);
            const change = p["حالة_التغير"];
            if (change) lines.push(`${t.filters.changeStatus}: ${changeLabel(change, lang)}`);
            const km2 =
              p["مساحة_كم2"] ??
              p["المساحة_كم2"] ??
              p["مساحة_التغير_كم2"] ??
              p["مساحة_المنطقة_كم2"] ??
              (p["SHAPE_Area"] ? p["SHAPE_Area"] / 1e6 : null) ??
              (p["Shape_Area"] ? p["Shape_Area"] / 1e6 : null);
            if (km2) lines.push(`${t.common.area}: ${Number(km2).toFixed(3)} ${t.stats.km2}`);
            const name = p["اسم_المسطح"];
            if (name) lines.push(`${t.common.name}: ${name}`);
            const stationName = p[STATION_NAME_FIELD];
            if (stationName) lines.push(`${t.common.name}: ${stationName}`);
            if (lines.length) lyr.bindTooltip(lines.join("<br/>"), { sticky: true });
            if (lines.length || Object.keys(p).length) {
              lyr.bindPopup(() => buildPopupHtml({ feature: feat, spec, lang, t, colorOverride: stationColors.get(feat) }), {
                className: "gis-feature-popup",
                closeButton: true,
                maxWidth: 350,
                minWidth: 230,
              });
            }
            hitTargetsRef.current[id]?.push({ layer: lyr, spec });
            lyr.on({
              mouseover: () => {
                highlightFeatureLayer(lyr, spec);
              },
              mouseout: () => {
                if (!lyr.isPopupOpen?.()) {
                  layer.resetStyle?.(lyr);
                  if (spec.type === "point") lyr.setRadius?.(spec.radius ?? 7);
                }
              },
              click: (event: any) => {
                highlightFeatureLayer(lyr, spec);
                lyr.openPopup?.(event?.latlng);
              },
              popupclose: () => {
                layer.resetStyle?.(lyr);
                if (spec.type === "point") lyr.setRadius?.(spec.radius ?? 7);
              },
            });
          },
        };
        layer = L.geoJSON(undefined, layerOptions);
        if (cancelled || !mapRef.current) return;
        layer.addTo(mapRef.current);
        layerRefs.current[id] = layer;

        if (isLargeLandCover) {
          for (let index = 0; index < filtered.features.length; index += LARGE_LAYER_BATCH_SIZE) {
            if (cancelled || layerRefs.current[id] !== layer) return;
            layer.addData({
              ...filtered,
              features: filtered.features.slice(index, index + LARGE_LAYER_BATCH_SIZE),
            } as any);
            await yieldToBrowser();
          }
        } else {
          layer.addData(filtered as any);
        }
      } catch (e) {
        if (!cancelled) console.error("layer load failed", spec.key, e);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [active, LRef, layers, lang, props.filterFn, t]);

  // Re-render when filterFn changes: clear existing layers so they reload with new filter
  useEffect(() => {
    if (!mapRef.current) return;
    Object.entries(layerRefs.current).forEach(([id, lyr]) => {
      if (lyr) {
        mapRef.current.removeLayer(lyr);
        layerRefs.current[id] = null;
      }
      hitTargetsRef.current[id] = [];
    });
    setActive((a) => new Set(a));
  }, [props.filterFn]);

  useEffect(() => {
    if (previousStyleKey.current === props.styleChangeKey) return;
    previousStyleKey.current = props.styleChangeKey;
    if (!mapRef.current) return;
    Object.entries(layerRefs.current).forEach(([id, lyr]) => {
      if (lyr) {
        mapRef.current.removeLayer(lyr);
        layerRefs.current[id] = null;
      }
    });
    setActive((current) => new Set(current));
  }, [props.styleChangeKey]);

  const toggle = (k: string) => {
    setActive((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  };

  const fullscreen = () => {
    const el = mapEl.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl"
      style={{ minHeight: props.height ?? "100%" }}
    >
      <div ref={mapEl} className="absolute inset-0 rounded-xl" />

      {/* Top-end controls */}
      <div
        className={`absolute top-3 z-[500] flex flex-col gap-2 ${
          dir === "rtl" ? "left-3" : "right-3"
        }`}
      >
        <div className="flex gap-1">
          <button
            onClick={() => setOpenCtrl((v) => !v)}
            aria-label={t.map.layers}
            aria-expanded={openCtrl}
            className={`glass surface-hover grid h-9 w-9 place-items-center rounded-lg border text-foreground hover:text-[var(--brand)] ${openCtrl ? "border-[var(--brand)]/60 text-[var(--brand)]" : ""}`}
            title={t.map.layers}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpenBasemap((value) => !value)}
            aria-label={t.map.basemap ?? "Basemap"}
            aria-expanded={openBasemap}
            className={`glass surface-hover grid h-9 w-9 place-items-center rounded-lg border text-foreground hover:text-[var(--brand)] ${openBasemap ? "border-[var(--brand)]/60 text-[var(--brand)]" : ""}`}
            title={t.map.basemap ?? "Basemap"}
          >
            <MapIcon className="h-4 w-4" />
          </button>
          <button
            onClick={fullscreen}
            aria-label={t.map.fullScreen}
            className="glass surface-hover grid h-9 w-9 place-items-center rounded-lg border text-foreground hover:text-[var(--brand)]"
            title={t.map.fullScreen}
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
        <AnimatePresence>
          {openBasemap && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="glass surface-hover min-w-28 rounded-lg border p-1.5"
            >
              {(Object.keys(BASEMAPS) as Basemap[]).map((b) => (
                <button
                  key={b}
                  onClick={() => { setBasemap(b); setOpenBasemap(false); }}
                  aria-label={`${t.map.basemap ?? "Basemap"}: ${t.map[b]}`}
                  aria-pressed={basemap === b}
                  className={`block w-full truncate rounded-md px-2.5 py-1.5 text-center text-[11px] font-bold ${
                    basemap === b
                      ? "bg-[var(--brand)]/20 text-[var(--brand)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.map[b]}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transit symbology key — bottom-left */}
      {props.showTransit !== false && (!openCtrl || props.showLayerControl === false) && (
        <div
          dir={lang === "ar" ? "rtl" : "ltr"}
          className="glass surface-hover absolute !bottom-3 !left-3 !right-auto !top-auto z-[500] w-[min(270px,calc(100%-1.5rem))] rounded-lg border p-2 shadow-lg"
          style={{ position: "absolute", left: "0.75rem", bottom: "0.75rem", right: "auto", top: "auto" }}
        >
          <p className="mb-1.5 text-[10px] font-extrabold text-foreground">
            {lang === "ar" ? "النقل السريع" : "Rapid transit"}
          </p>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {layers.filter((layer) => isTransitLayer(layer.key)).map((layer) => (
              <li key={layer.key} className="flex items-center justify-between gap-2 text-[10px] font-bold text-foreground/90">
                <span className="truncate" title={layer.label}>{layer.label}</span>
                {layer.type === "line" ? (
                  <span className="inline-block h-1 w-6 shrink-0 rounded-full shadow-sm" style={{ background: layer.fixedColor }} />
                ) : (
                  <span
                    className={`inline-block h-3 w-3 shrink-0 border border-white shadow-sm ring-1 ring-foreground/25 ${layer.pointShape === "firefly" ? "transit-firefly-swatch rounded-full" : "rounded-full"}`}
                    style={{ background: MULTICOLOR_STATIONS }}
                  >{layer.pointShape === "metro" && <span className="grid h-full place-items-center text-[6px] font-black leading-none text-white">M</span>}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Layer panel */}
      <AnimatePresence>
        {openCtrl && props.showLayerControl !== false && (
          <motion.div
            initial={{ opacity: 0, x: dir === "rtl" ? 30 : -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir === "rtl" ? 30 : -30 }}
            className="absolute bottom-3 left-3 top-14 z-[500] flex w-56 max-w-[calc(100%-1.5rem)] items-end overflow-hidden"
          >
            <div className="glass surface-hover flex max-h-full w-full min-h-0 flex-col overflow-hidden rounded-xl border p-3">
              <div className="mb-2 flex items-center gap-2">
                <MapIcon className="h-3.5 w-3.5 text-[var(--brand)]" />
                <p className="text-sm font-extrabold text-foreground">{t.map.layers}</p>
              </div>
              <ul className="min-h-0 space-y-1.5 overflow-y-auto pe-1">
                {layers.map((l) => (
                  <li key={l.key} className="flex items-center justify-between gap-2">
                    <label className="flex min-w-0 cursor-pointer items-center gap-2 text-xs text-foreground">
                      <input
                        type="checkbox"
                        checked={active.has(l.key)}
                        onChange={() => toggle(l.key)}
                        className="h-3.5 w-3.5 shrink-0 accent-[var(--brand)]"
                      />
                      <span className="truncate" title={l.label}>{l.label}</span>
                    </label>
                    {l.fixedColor &&
                      (l.type === "line" ? (
                        <span className="inline-block h-1 w-6 shrink-0 rounded-full shadow-sm" style={{ background: l.fixedColor }} />
                      ) : l.type === "point" ? (
                        <span
                          className={`inline-block h-3 w-3 shrink-0 border border-white shadow-sm ring-1 ring-foreground/25 ${l.pointShape === "firefly" ? "transit-firefly-swatch rounded-full" : "rounded-full"}`}
                          style={{ background: MULTICOLOR_STATIONS }}
                        >{l.pointShape === "metro" && <span className="grid h-full place-items-center text-[6px] font-black leading-none text-white">M</span>}</span>
                      ) : (
                        <span className="inline-block h-3 w-3 rounded-sm border border-foreground/20" style={{ background: l.fixedColor }} />
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend bottom-end */}
      {props.showLegend && props.legendItems && props.legendItems.length > 0 && (
        <div className="absolute bottom-3 right-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-col items-end justify-end gap-1.5 overflow-hidden">
          <AnimatePresence>
            {openLegend && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`glass surface-hover flex min-h-0 max-w-full flex-col overflow-hidden rounded-xl border p-2.5 sm:p-3 ${
                  props.legendType === "gradient"
                    ? "w-[min(250px,calc(100vw-2.25rem))]"
                    : "w-[min(210px,calc(100vw-2.25rem))]"
                }`}
              >
                <p className="text-sm font-black text-foreground">{props.legendTitle ?? t.map.legend}</p>
                {props.legendHint && (
                  <p className="mt-1 text-[9px] font-semibold leading-4 text-muted-foreground">{props.legendHint}</p>
                )}
                {props.legendType === "gradient" && (
                  <div className="my-2.5">
                    <div
                      className="h-4 rounded-full border border-border shadow-inner"
                      style={{
                        background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${props.legendItems.map((item) => item.color).join(", ")})`,
                      }}
                    />
                    <div className="mt-1 flex justify-between text-[9px] font-extrabold text-muted-foreground">
                      <span>{lang === "ar" ? "أقل" : "Lower"}</span>
                      <span>{lang === "ar" ? "أعلى" : "Higher"}</span>
                    </div>
                  </div>
                )}
                <ul className="grid min-h-0 grid-cols-1 gap-1 overflow-y-auto pe-1 sm:gap-1.5">
                  {props.legendItems.map((it, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-2 py-0.5 text-[10px] sm:py-1">
                      <span className="min-w-0 truncate text-right font-bold text-foreground/90" title={it.label}>
                        {it.label}
                      </span>
                      <span
                        className="inline-block h-3.5 w-7 rounded-full border border-foreground/20"
                        style={{ background: it.color }}
                      />
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setOpenLegend((value) => !value)}
            aria-label={t.map.legend}
            aria-expanded={openLegend}
            className={`glass surface-hover flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold text-foreground ${openLegend ? "border-[var(--brand)]/60 text-[var(--brand)]" : ""}`}
          >
            <MapIcon className="h-4 w-4" />
            {t.map.legend}
          </button>
        </div>
      )}
    </div>
  );
}
