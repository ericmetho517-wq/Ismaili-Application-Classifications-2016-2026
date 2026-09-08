import { useEffect, useMemo, useRef, useState } from "react";
import type { AnyFC, LayerKey } from "@/lib/data";
import { loadMapLayer } from "@/lib/data";
import { MAP_COLORS, colorFor, labelFor, changeColor, changeLabel } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";
import { translateFieldLabel, translateValue } from "@/lib/labels";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Maximize2,
  Map as MapIcon,
} from "lucide-react";

type LayerSpec = {
  key: LayerKey;
  label: string;
  type: "polygon" | "line" | "boundary" | "point";
  styleBy?: "use" | "agriculture" | "change" | "fixed" | "price2016" | "price2026" | "priceGrowth";
  fixedColor?: string;
  fillColor?: string;
  weight?: number;
  dashArray?: string;
  dashOffset?: string;
  lineCap?: "butt" | "round" | "square";
  radius?: number;
  pointShape?: "circle" | "firefly" | "metro";
  opacity?: number;
  fillOpacity?: number;
  smoothFactor?: number;
  outlineOnly?: boolean;
  interactive?: boolean;
};

type Basemap = "blue" | "streets" | "satellite" | "dark";

const BASEMAPS: Record<Basemap, { url: string; attribution: string; className?: string }> = {
  blue: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
    className: "corporate-blue-basemap",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap contributors © CARTO",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Esri World Imagery © Esri",
  },
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
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
  transportVariant?: "roads" | "all";
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
const LARGE_LAYER_BATCH_SIZE = 2000;
const ROAD_LINES: Array<LayerSpec & { labelAr: string; labelEn: string }> = [
  { key: "Road_CairoRing", label: "", labelAr: "الطريق الدائري", labelEn: "Cairo Ring Road", type: "line", fixedColor: "#20cfc4", weight: 3, lineCap: "round" },
  { key: "Road_MiddleRing", label: "", labelAr: "الطريق الدائري الأوسطي", labelEn: "Middle Ring Road", type: "line", fixedColor: "#123b7a", weight: 3, lineCap: "round" },
  { key: "Road_RegionalRing", label: "", labelAr: "الطريق الدائري الإقليمي", labelEn: "Regional Ring Road", type: "line", fixedColor: "#e218b8", weight: 3, lineCap: "round" },
];
const TRANSIT_LINES: Array<LayerSpec & { labelAr: string; labelEn: string }> = [
  { key: "Transit_Metro3", label: "", labelAr: "خط المترو الثالث", labelEn: "Metro Line 3", type: "line", fixedColor: "#2f80ed", weight: 2.5, dashArray: "", lineCap: "round" },
  { key: "Transit_Metro4", label: "", labelAr: "خط المترو الرابع", labelEn: "Metro Line 4", type: "line", fixedColor: "#f2b632", weight: 2.5, dashArray: "", lineCap: "round" },
  { key: "Transit_LRT", label: "", labelAr: "خط القطار الكهربائي (LRT)", labelEn: "LRT Rail Line", type: "line", fixedColor: "#54d83a", weight: 2.5, dashArray: "", lineCap: "round" },
  { key: "Transit_MonorailCapital", label: "", labelAr: "مونوريل العاصمة", labelEn: "Capital Monorail", type: "line", fixedColor: "#d8d8d8", weight: 2.5, dashArray: "", lineCap: "round" },
  { key: "Transit_RobikiBelbeis", label: "", labelAr: "سكة حديد الروبيكي - بلبيس", labelEn: "Robiki–Belbeis Railway", type: "line", fixedColor: "#171717", weight: 2.8, dashArray: "", lineCap: "round" },
];

const ROAD_LAYER_KEYS: LayerKey[] = ROAD_LINES.map((line) => line.key);
const TRANSIT_LAYER_KEYS: LayerKey[] = TRANSIT_LINES.map((line) => line.key);
const TRANSPORT_LAYER_KEYS: LayerKey[] = [...ROAD_LAYER_KEYS, ...TRANSIT_LAYER_KEYS];

const PRICE_2016_FIELD = "سعر_الأرض_2016";
const PRICE_2026_FIELD = "سعر_الأرض_2026";

// Violet remains legible over the greens, sand, water, and built-up areas in satellite imagery.
const PRICE_BAND_COLORS = ["#f0abfc", "#d946ef", "#9333ea", "#4c1d95"] as const;
const PRICE_GROWTH_COLORS = PRICE_BAND_COLORS;

const AGRICULTURAL_STYLE = {
  land: { fill: "#84cc16", stroke: "#d9f99d" },
  animal: { fill: "#f59e0b", stroke: "#fef3c7" },
  greenhouse: { fill: "#06b6d4", stroke: "#cffafe" },
} as const;

function agriculturalStyle(props: Record<string, any>) {
  const use = String(props["وصف_الاستخدام"] ?? "").trim();
  if (/حيوان|دواجن|ماشية/.test(use)) return AGRICULTURAL_STYLE.animal;
  if (/صوب|محمية/.test(use)) return AGRICULTURAL_STYLE.greenhouse;
  return AGRICULTURAL_STYLE.land;
}

export function agriculturalLegendItems(lang: "ar" | "en") {
  const labels = lang === "ar"
    ? ["أرض زراعية", "مزارع حيوانية", "صوب زراعية"]
    : ["Agricultural land", "Animal farms", "Greenhouses"];
  return [
    { color: AGRICULTURAL_STYLE.land.fill, label: labels[0] },
    { color: AGRICULTURAL_STYLE.animal.fill, label: labels[1] },
    { color: AGRICULTURAL_STYLE.greenhouse.fill, label: labels[2] },
  ];
}

export function landUseLegendItems(lang: "ar" | "en") {
  const labels = lang === "ar"
    ? ["الأراضي الزراعية", "الأراضي العمرانية", "الأراضي الصناعية", "الأراضي الفضاء", "المناطق الخدمية", "المياه", "الطرق"]
    : ["Agricultural land", "Urban land", "Industrial land", "Vacant land", "Services", "Water", "Roads"];
  const officialLabels = lang === "ar"
    ? ["\u0627\u0644\u0639\u0645\u0631\u0627\u0646", "\u0627\u0644\u0632\u0631\u0627\u0639\u0629", "\u0627\u0644\u0635\u0646\u0627\u0639\u0629", "\u0623\u0631\u0636 \u0641\u0636\u0627\u0621", "\u0623\u0631\u0627\u0636\u064a \u0627\u0644\u0642\u0648\u0627\u062a \u0627\u0644\u0645\u0633\u0644\u062d\u0629", "\u062d\u0631\u0645 \u0627\u0644\u0637\u0631\u064a\u0642", "\u0623\u0631\u0627\u0636\u064a \u0627\u0644\u062e\u062f\u0645\u0627\u062a", "\u0627\u0644\u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u062a\u0631\u0641\u064a\u0647\u064a\u0629", "\u0645\u0633\u0637\u062d\u0627\u062a \u0645\u0627\u0626\u064a\u0629", "\u0627\u0644\u0645\u0642\u0627\u0628\u0631", "\u062f\u064a\u0646\u064a", "\u0627\u0644\u0623\u0631\u0627\u0636\u064a \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629", "\u0627\u0644\u0623\u0631\u0627\u0636\u064a \u0627\u0644\u062d\u0643\u0648\u0645\u064a\u0629", "\u0627\u0644\u0623\u0631\u0627\u0636\u064a \u0627\u0644\u0633\u064a\u0627\u062d\u064a\u0629", "\u0645\u0633\u0627\u062d\u0627\u062a \u062e\u0636\u0631\u0627\u0621"]
    : ["Urban", "Agriculture", "Industrial", "Vacant land", "Military land", "Road reserve", "Services", "Recreation", "Water bodies", "Cemeteries", "Religious", "Educational", "Government", "Tourism", "Green spaces"];
  return ["#f59e0b", "#16a34a", "#8b00b8", "#fffbd1", "#ff1616", "#555555", "#14b8a6", "#b8c6b2", "#08aee5", "#8a8a8a", "#d9dde2", "#315d9b", "#a66c00", "#0bd1c0", "#70cf50"].map((color, index) => ({ color, label: officialLabels[index] }));
}

function unitLandPrice(props: Record<string, any>, year: 2016 | 2026) {
  const total = Number(props[year === 2016 ? PRICE_2016_FIELD : PRICE_2026_FIELD] ?? 0);
  const area = Number(props.SHAPE_Area ?? props.Shape_Area ?? 0);
  return total > 0 && area > 0 ? total / area : 0;
}

function classificationColor(props: Record<string, any>) {
  const code = String(props["استخدام_الأرض"] ?? "").trim();
  if (code === "3") return MAP_COLORS.urban;
  if (code === "2") return "#fff7b2";
  if (code === "4") return "#ff2020";
  if (code === "1") return MAP_COLORS.industrial;
  if (code === "6") return "#b8d989";
  if (code === "7") return "#777777";
  if (code === "8") return MAP_COLORS.water;
  if (code === "12") return "#2f66b3";
  if (code === "14") return "#00cbb5";
  if (!code) return MAP_COLORS.agricultural;
  if (code === "5" || code === "11") return MAP_COLORS.services;
  return colorFor(props["وصف_الاستخدام"]);
}

function priceColor(props: Record<string, any>, mode: "price2016" | "price2026" | "priceGrowth") {
  if (mode === "priceGrowth") {
    const p16 = unitLandPrice(props, 2016);
    const p26 = unitLandPrice(props, 2026);
    if (!p16 || !p26) return "#475569";
    const growth = ((p26 - p16) / p16) * 100;
    if (growth >= 120) return PRICE_GROWTH_COLORS[3];
    if (growth >= 80) return PRICE_GROWTH_COLORS[2];
    if (growth >= 40) return PRICE_GROWTH_COLORS[1];
    return PRICE_GROWTH_COLORS[0];
  }
  const price = unitLandPrice(props, mode === "price2016" ? 2016 : 2026);
  if (!price) return "#475569";
  if (price >= 2000) return PRICE_BAND_COLORS[3];
  if (price >= 1000) return PRICE_BAND_COLORS[2];
  if (price >= 500) return PRICE_BAND_COLORS[1];
  return PRICE_BAND_COLORS[0];
}

export function priceLegendItems(mode: "price2016" | "price2026" | "priceGrowth", lang: "ar" | "en") {
  if (mode === "priceGrowth") {
    const labels =
      lang === "ar"
        ? ["أقل من 40%", "40% - 80%", "80% - 120%", "120% فأكثر"]
        : ["Below 40%", "40% - 80%", "80% - 120%", "120%+"];
    return PRICE_GROWTH_COLORS.map((color, index) => ({ color, label: labels[index] }));
  }

  const labels =
    lang === "ar"
      ? ["أقل من 500 جنيه/م²", "500 - 1,000 جنيه/م²", "1,000 - 2,000 جنيه/م²", "2,000 جنيه/م² فأكثر"]
      : ["Below 500 EGP/m²", "500 - 1,000 EGP/m²", "1,000 - 2,000 EGP/m²", "2,000+ EGP/m²"];
  return PRICE_BAND_COLORS.map((color, index) => ({ color, label: labels[index] }));
}

function registerSyncedMap(group: string, map: any) {
  if (!syncedMapGroups[group]) syncedMapGroups[group] = new Set();
  const peers = syncedMapGroups[group];
  peers.add(map);

  const activePeer = Array.from(peers).find((peer) => peer !== map);
  if (activePeer) {
    map._dashboardSyncing = true;
    map.setView(activePeer.getCenter(), activePeer.getZoom(), { animate: false });
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
    GlobalID: { ar: "المعرف العالمي", en: "Global ID" },
  };
  if (known[key]) return known[key][lang];

  const translated = translateFieldLabel(key, lang);
  if (translated !== key) return translated;

  const normalized = key.replace(/^Shape_/i, "مساحة_").replace(/_/g, " ");
  return lang === "ar" ? normalized : key;
}

function isDisplayableValue(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return false;
  const s = String(val).trim();
  if (!s || s === "0" || s === "Null" || s === "0.0") return false;
  return true;
}

function isHiddenPopupField(key: string) {
  const hiddenKeys = new Set(["OBJECTID", "GlobalID"]);
  return hiddenKeys.has(key) || key.startsWith("FID_");
}

function popupLabel(key: string, lang: "ar" | "en", t: any) {
  if (key === "وصف_الاستخدام") return t.filters.landUse;
  if (key === "استخدام_الأرض") return t.filters.landUse;
  if (key === "حالة_التغير") return t.filters.changeStatus;
  if (
    key === "مساحة_كم2" ||
    key === "المساحة_كم2" ||
    key === "مساحة_التغير_كم2" ||
    key === "مساحة_المنطقة_كم2"
  ) {
    return t.common.area;
  }
  if (key === "المساحة_فدان") return lang === "ar" ? "المساحة بالفدان" : "Area in feddan";
  if (key === "مساحة_التغير_بالمتر") return lang === "ar" ? "مساحة التغير (م²)" : "Change area (m²)";
  if (key === "SHAPE_Length" || key === "Shape_Length") return lang === "ar" ? "المحيط/الطول" : "Perimeter/Length";
  if (key === "SHAPE_Area" || key === "Shape_Area") return lang === "ar" ? "المساحة" : "Area";
  if (key === "سعر_الأرض_2016") return lang === "ar" ? "إجمالي سعر الأرض 2016" : "2016 Total Land Price";
  if (key === "سعر_الأرض_2026") return lang === "ar" ? "إجمالي سعر الأرض 2026" : "2026 Total Land Price";
  return formatFieldName(key, lang);
}

function rowKey(key: string) {
  return key
    .replace(/^Shape_/i, "")
    .replace(/^SHAPE_/i, "")
    .replace(/_/g, "")
    .toLowerCase();
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
  const transitName = p["اسم_الخط"] ?? p["اسم_الجزء"];
  const contextualName = transitName ?? waterName ?? rawName ?? p["اسم_المحور"] ?? p["اسم_القطاع"];
  const use = rawName ?? p["استخدام_الأرض"];
  const title =
    isDisplayableValue(contextualName)
      ? translateValue(repairText(contextualName), lang)
      : use
        ? labelFor(use, lang)
        : spec.label;
  const color = colorOverride ?? spec.fixedColor ?? "#64748b";

  const rows: Array<[string, unknown]> = Object.keys(p)
    .filter((k) => !isHiddenPopupField(k) && isDisplayableValue(p[k]))
    .map((k) => [k, p[k]] as [string, unknown])
    .filter(([key, value], index, arr) => {
      return (
        arr.findIndex(
          ([candidate]) => rowKey(candidate) === rowKey(key),
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
      </div>
      <p class="gis-popup-section-title">${escapeHtml(lang === "ar" ? "تفاصيل المعلم" : "Feature details")}</p>
      <div class="gis-popup-grid">${tableRows}</div>
    </article>
  `;
}

function highlightFeatureLayer(lyr: any, spec: LayerSpec) {
  const highlightColor = lyr.options?.fillColor ?? lyr.options?.color ?? spec.fixedColor ?? "#3b82f6";
  if (spec.type === "point") {
    lyr.setRadius?.((spec.radius ?? 7) + 2);
    lyr.setStyle?.({ color: highlightColor, weight: 3, fillOpacity: 1, opacity: 1 });
  } else if (spec.type === "line") {
    lyr.setStyle?.({
      weight: Math.max((spec.weight ?? 3) + 3, 6),
      opacity: 1,
    });
  } else if (spec.type === "boundary") {
    lyr.setStyle?.({
      color: spec.fixedColor ?? highlightColor,
      weight: 3,
      opacity: 1,
      fill: true,
      fillColor: spec.fillColor ?? "#ffe7a3",
      fillOpacity: Math.min((spec.fillOpacity ?? 0.16) + 0.06, 0.24),
    });
  } else {
    lyr.setStyle?.({
      color: highlightColor,
      weight: 2.8,
      opacity: 1,
      fillOpacity: Math.min((spec.fillOpacity ?? 0.7) + 0.15, 0.95),
    });
  }
  lyr.bringToFront?.();
}

function resetFeatureLayerStyle(lyr: any, spec: LayerSpec, colorOverride?: string) {
  if (spec.type === "point") {
    lyr.setRadius?.(spec.radius ?? 7);
    lyr.setStyle?.({
      color: "#ffffff",
      weight: 1.5,
      fillColor: colorOverride ?? spec.fixedColor ?? "#22c55e",
      fillOpacity: spec.fillOpacity ?? 0.9,
      opacity: spec.opacity ?? 1,
    });
  } else if (spec.type === "line") {
    lyr.setStyle?.({
      color: colorOverride ?? spec.fixedColor ?? "#22d3ee",
      weight: spec.weight ?? 3,
      opacity: spec.opacity ?? 0.9,
      dashArray: spec.dashArray,
    });
  } else if (spec.type === "boundary") {
    lyr.setStyle?.({
      color: spec.fixedColor ?? "#22d3ee",
      weight: spec.weight ?? 2.2,
      opacity: spec.opacity ?? 0.9,
      fill: true,
      fillColor: spec.fillColor ?? "#ffe7a3",
      fillOpacity: spec.fillOpacity ?? 0.16,
      dashArray: spec.dashArray ?? "8 6",
    });
  } else {
    const p = lyr.feature?.properties || {};
    let fill = colorOverride ?? spec.fixedColor ?? "#64748b";
    let stroke = fill;
    if (!colorOverride) {
      if (spec.styleBy === "use") fill = classificationColor(p);
      else if (spec.styleBy === "agriculture") {
        const agricultural = agriculturalStyle(p);
        fill = agricultural.fill;
        stroke = agricultural.stroke;
      }
      else if (spec.styleBy === "change") fill = changeColor(p["حالة_التغير"]);
      else if (spec.styleBy === "price2016" || spec.styleBy === "price2026" || spec.styleBy === "priceGrowth") {
        fill = priceColor(p, spec.styleBy);
      }
    }
    if (spec.styleBy !== "agriculture") stroke = fill;
    if (spec.outlineOnly) {
      lyr.setStyle?.({
        color: spec.fixedColor ?? "#ffffff",
        weight: spec.weight ?? 3,
        fillColor: fill,
        fillOpacity: 0,
        fillRule: "nonzero",
        opacity: spec.opacity ?? 1,
      });
    } else {
      lyr.setStyle?.({
        color: stroke,
        weight: spec.weight ?? 0.5,
        fillColor: fill,
        fillOpacity: spec.fillOpacity ?? 0.76,
        fillRule: "nonzero",
        opacity: 0.95,
      });
    }
  }
}

export function MapView(props: MapViewProps) {
  const { t, lang } = useI18n();
  const defaultBasemap: Basemap = "satellite";
  const dir = lang === "ar" ? "rtl" : "ltr";

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRefs = useRef<Record<string, any>>({});
  const hitTargetsRef = useRef<Record<string, Array<{ layer: any; spec: LayerSpec }>>>({});
  const tileRef = useRef<any>(null);
  const syncCleanupRef = useRef<null | (() => void)>(null);
  const transitFitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFittedTransitRef = useRef(false);
  const previousStyleKey = useRef(props.styleChangeKey);
  const [LRef, setLRef] = useState<any>(null);

  const [active, setActive] = useState<Set<string>>(
    new Set(props.initialActive ?? props.layers.map((l) => l.key)),
  );
  const [basemap, setBasemap] = useState<Basemap>(props.initialBasemap ?? defaultBasemap);
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

      const map = L.map(mapEl.current, {
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
        wheelDebounceTime: 30,
        wheelPxPerZoomLevel: 80,
      }).setView([30.59, 32.27], 11);

      map.createPane("study-boundary").style.zIndex = "410";
      map.createPane("map-features").style.zIndex = "420";
      map.createPane("route-lines").style.zIndex = "430";
      map.createPane("transit-lines").style.zIndex = "640";
      map.createPane("transit-stations").style.zIndex = "650";
      mapRef.current = map;

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
      const config =
        basemap === "satellite" && props.satelliteVintage === "2016"
          ? SATELLITE_2016
          : BASEMAPS[basemap];
      tileRef.current = L.tileLayer(config.url, {
        attribution: config.attribution,
        className: "className" in config ? (config as any).className : undefined,
        maxZoom: 19,
      }).addTo(map);

      if (props.initialBounds) {
        map.fitBounds(props.initialBounds, { padding: [18, 18], maxZoom: 17 });
      }

      try {
        const fc = await loadMapLayer("Study_Area_Sector");
        if (!props.initialBounds) {
          const studyBounds = L.geoJSON(fc as any).getBounds();
          if (studyBounds.isValid()) {
            map.fitBounds(studyBounds, { padding: [24, 24], maxZoom: 11, animate: false });
          }
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (mapRef.current) {
        if (transitFitTimerRef.current) clearTimeout(transitFitTimerRef.current);
        syncCleanupRef.current?.();
        syncCleanupRef.current = null;
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !props.initialBounds) return;
    mapRef.current.fitBounds(props.initialBounds, { padding: [18, 18], maxZoom: 17 });
  }, [props.fitBoundsOnChangeKey, props.initialBounds]);

  // Switch basemap
  useEffect(() => {
    if (!mapRef.current || !LRef || !tileRef.current) return;
    const config =
      basemap === "satellite" && props.satelliteVintage === "2016"
        ? SATELLITE_2016
        : BASEMAPS[basemap];

    mapRef.current.removeLayer(tileRef.current);
    tileRef.current = LRef.tileLayer(config.url, {
      attribution: config.attribution,
      className: "className" in config ? (config as any).className : undefined,
      maxZoom: 19,
    }).addTo(mapRef.current);
  }, [LRef, basemap, props.satelliteVintage]);

  // Keep the shared road and rail network visible on every main dashboard map.
  useEffect(() => {
    if (props.showTransit === false) return;
    setActive((prev) => {
      const next = new Set(prev);
      const transportKeys = props.transportVariant === "roads" ? ROAD_LAYER_KEYS.slice(0, 1) : TRANSPORT_LAYER_KEYS;
      transportKeys.forEach((key) => next.add(key));
      return next;
    });
  }, [props.showTransit, props.transportVariant]);

  const filterFn = props.filterFn;
  const layers = useMemo(() => {
    if (props.showTransit === false) return props.layers;
    const transportLines = props.transportVariant === "roads" ? ROAD_LINES.slice(0, 1) : [...ROAD_LINES, ...TRANSIT_LINES];
    const extra: LayerSpec[] = transportLines.map((line) => ({
      ...line,
      label: lang === "ar" ? line.labelAr : line.labelEn,
      opacity: ROAD_LAYER_KEYS.includes(line.key) ? 0.95 : 0.9,
      interactive: false,
    }));
    return [...props.layers, ...extra];
  }, [props.layers, props.showTransit, props.transportVariant, lang]);

  // Load/toggle layers
  useEffect(() => {
    if (!mapRef.current || !LRef) return;
    const map = mapRef.current;
    const L = LRef;
    let cancelled = false;

    const layerMap = new Map(layers.map((spec) => [spec.key, spec]));

    // Remove layers no longer active or present
    Object.keys(layerRefs.current).forEach((key) => {
      if (!active.has(key) || !layerMap.has(key as LayerKey)) {
        map.removeLayer(layerRefs.current[key]);
        delete layerRefs.current[key];
        delete hitTargetsRef.current[key];
      }
    });

    const isStyleKeyChanged = previousStyleKey.current !== props.styleChangeKey;
    previousStyleKey.current = props.styleChangeKey;

    layers.forEach((spec) => {
      if (!active.has(spec.key)) return;
      const allowInteraction = spec.interactive ?? true;

      // Update existing layer style if styleKey changed
      if (layerRefs.current[spec.key]) {
        if (!isStyleKeyChanged) return;
        const existingLayer = layerRefs.current[spec.key];
        const targets = hitTargetsRef.current[spec.key] ?? [];
        targets.forEach(({ layer: lyr }) => {
          const feat = lyr.feature;
          const p = feat?.properties || {};
          const colorOverride: string | undefined = undefined;
          resetFeatureLayerStyle(lyr, spec, colorOverride);

          if (allowInteraction && feat) {
            const isPopupOpened = lyr.isPopupOpen?.();
            lyr.bindPopup(
              buildPopupHtml({
                feature: feat,
                spec,
                lang,
                t,
                colorOverride,
              }),
              { className: "gis-feature-popup" },
            );
            if (isPopupOpened) {
              highlightFeatureLayer(lyr, spec);
            }
          }
        });

        if (existingLayer.setStyle && !existingLayer.eachLayer) {
          resetFeatureLayerStyle(existingLayer, spec);
        }
        return;
      }

      // Add new layer
      (async () => {
        try {
          const fc = await loadMapLayer(spec.key);
          if (cancelled) return;

          const rawFeatures = Array.isArray(fc.features) ? fc.features : [];
          const features = filterFn
            ? rawFeatures.filter((feat: any) => filterFn(spec.key, feat.properties ?? {}))
            : rawFeatures;

          const activeFc = { ...fc, features };
          const isLargeDataset = features.length > LARGE_LAYER_BATCH_SIZE;
          const layerInteractive = allowInteraction && !isLargeDataset;
          const targetPane =
            spec.key === "Study_Area_Sector"
              ? "study-boundary"
              : spec.type === "point"
                ? "transit-stations"
                : spec.type === "line"
                  ? TRANSIT_LAYER_KEYS.includes(spec.key)
                    ? "transit-lines"
                    : "route-lines"
                  : "map-features";

          const hitTargets: Array<{ layer: any; spec: LayerSpec }> = [];
          const layer = L.geoJSON(undefined, {
            pane: targetPane,
            renderer: spec.type === "line" ? L.svg({ pane: targetPane, padding: 0.5 }) : undefined,
            interactive: layerInteractive,
            pointToLayer: (feat: any, latlng: any) => {
              const colorOverride: string | undefined = undefined;
              const isFirefly = spec.pointShape === "firefly";
              const isMetro = spec.pointShape === "metro";
              const pointColor = colorOverride ?? spec.fixedColor ?? "#22c55e";

              if (isMetro) {
                const iconHtml = `<div class="transit-metro-marker" style="--station-color:${pointColor}"><span>M</span></div>`;
                const icon = L.divIcon({
                  className: "transit-metro-div-icon",
                  html: iconHtml,
                  iconSize: [22, 22],
                  iconAnchor: [11, 11],
                });
                return L.marker(latlng, { icon, pane: targetPane });
              }

              if (isFirefly) {
                const iconHtml = `<div class="transit-firefly-marker" style="--station-color:${pointColor}"></div>`;
                const icon = L.divIcon({
                  className: "transit-firefly-div-icon",
                  html: iconHtml,
                  iconSize: [18, 18],
                  iconAnchor: [9, 9],
                });
                return L.marker(latlng, { icon, pane: targetPane });
              }

              return L.circleMarker(latlng, {
                pane: targetPane,
                radius: spec.radius ?? 7,
                color: "#ffffff",
                weight: 1.5,
                fillColor: pointColor,
                fillOpacity: spec.fillOpacity ?? 0.9,
              });
            },
            style: (feat: any) => {
              const p = feat?.properties || {};
              if (spec.type === "line") {
                return {
                  color: spec.fixedColor ?? "#22d3ee",
                  weight: spec.weight ?? 3,
                  opacity: spec.opacity ?? 0.9,
                  dashArray: spec.dashArray ?? "",
                  dashOffset: spec.dashOffset,
                  lineCap: spec.lineCap ?? "round",
                  lineJoin: "round",
                  className: "animated-line-path",
                };
              }
              if (spec.type === "boundary") {
                return {
                  color: spec.fixedColor ?? "#22d3ee",
                  weight: spec.weight ?? 2.2,
                  opacity: spec.opacity ?? 0.9,
                  fill: true,
                  fillColor: spec.fillColor ?? "#ffe7a3",
                  fillOpacity: spec.fillOpacity ?? 0.16,
                  dashArray: spec.dashArray ?? "8 6",
                };
              }
              let fill = spec.fixedColor ?? "#64748b";
              let stroke = fill;
              if (spec.styleBy === "use") fill = classificationColor(p);
              else if (spec.styleBy === "agriculture") {
                const agricultural = agriculturalStyle(p);
                fill = agricultural.fill;
                stroke = agricultural.stroke;
              }
              else if (spec.styleBy === "change") fill = changeColor(p["حالة_التغير"]);
              else if (spec.styleBy === "price2016" || spec.styleBy === "price2026" || spec.styleBy === "priceGrowth") {
                fill = priceColor(p, spec.styleBy);
              }
              if (spec.styleBy !== "agriculture") stroke = fill;
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
                color: stroke,
                weight: spec.weight ?? 0.5,
                fillColor: fill,
                fillOpacity: spec.fillOpacity ?? 0.76,
                fillRule: "nonzero",
                opacity: 0.95,
                // Large parcel layers are already simplified on export. A high
                // Leaflet smoothFactor collapses small four-sided parcels into
                // triangles at overview zoom levels and corrupts the choropleth.
                smoothFactor: spec.smoothFactor ?? (isLargeDataset ? 0.35 : 1),
              };
            },
            onEachFeature: (feat: any, lyr: any) => {
              if (spec.type === "line") {
                lyr.on("add", () => {
                  const element = lyr.getElement?.();
                  if (!element) return;
                  element.classList.add("map-road-solid");
                });
              }
              if (!layerInteractive) return;
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
              const transitName = p["اسم_الخط"];
              if (transitName) lines.push(`${t.common.name}: ${transitName}`);

              if (lines.length) lyr.bindTooltip(lines.join("<br/>"), { sticky: true });
              if (lines.length || Object.keys(p).length) {
                const colorOverride: string | undefined = undefined;

                lyr.bindPopup(
                  buildPopupHtml({
                    feature: feat,
                    spec,
                    lang,
                    t,
                    colorOverride,
                  }),
                  { className: "gis-feature-popup" },
                );

                lyr.on("popupopen", () => {
                  highlightFeatureLayer(lyr, spec);
                });

                lyr.on("popupclose", () => {
                  resetFeatureLayerStyle(lyr, spec, colorOverride);
                });

                hitTargets.push({ layer: lyr, spec });
              }
            },
          });

          if (!cancelled && active.has(spec.key)) {
            layer.addTo(map);
            layerRefs.current[spec.key] = layer;
            hitTargetsRef.current[spec.key] = hitTargets;

            if (isLargeDataset) {
              for (let i = 0; i < features.length; i += LARGE_LAYER_BATCH_SIZE) {
                if (cancelled || !active.has(spec.key)) break;
                layer.addData({ type: "FeatureCollection", features: features.slice(i, i + LARGE_LAYER_BATCH_SIZE) });
                await new Promise((res) => setTimeout(res, 0));
              }
            } else {
              layer.addData(activeFc);
            }

            if (TRANSIT_LAYER_KEYS.includes(spec.key) && !hasFittedTransitRef.current) {
              if (transitFitTimerRef.current) clearTimeout(transitFitTimerRef.current);
              transitFitTimerRef.current = setTimeout(() => {
                if (cancelled || !mapRef.current) return;
                const bounds = L.latLngBounds([]);
                ["Study_Area_Sector", ...TRANSIT_LAYER_KEYS].forEach((key) => {
                  const visibleLayer = layerRefs.current[key];
                  const layerBounds = visibleLayer?.getBounds?.();
                  if (layerBounds?.isValid?.()) bounds.extend(layerBounds);
                });
                if (bounds.isValid()) {
                  map.fitBounds(bounds, { padding: [28, 28], maxZoom: 10, animate: false });
                  hasFittedTransitRef.current = true;
                }
              }, 220);
            }
          }
        } catch {}
      })();
    });
  }, [LRef, active, filterFn, layers, lang, t, props.styleChangeKey]);

  const toggle = (key: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fullscreen = async () => {
    const el = mapEl.current?.parentElement as (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }) | null;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen();
      else await el.webkitRequestFullscreen?.();
    } catch {
      return;
    } finally {
      window.setTimeout(() => mapRef.current?.invalidateSize({ pan: false }), 80);
    }
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl"
      style={{ minHeight: props.height ?? "100%" }}
    >
      <div ref={mapEl} className="absolute inset-0 rounded-xl" />

      {/* Top-end controls */}
      <div
        className={`absolute top-3 z-[700] flex flex-col gap-2 ${
          dir === "rtl" ? "left-[4.25rem]" : "right-3"
        }`}
      >
        <div className="flex gap-1.5 flex-wrap justify-end">
          {/* Standard map controls */}
          <button
            onClick={() => setOpenCtrl((v) => !v)}
            aria-label={t.map.layers}
            className={`glass surface-hover grid h-9 w-9 place-items-center rounded-lg border text-foreground hover:text-[var(--brand)] ${openCtrl ? "border-[var(--brand)]/60 text-[var(--brand)]" : ""}`}
            title={t.map.layers}
          >
            <Layers className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOpenBasemap((value) => !value)}
            aria-label={t.map.basemap ?? "Basemap"}
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

        {/* Basemap Switcher Popover */}
        <AnimatePresence>
          {openBasemap && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              className="glass surface-hover flex flex-col gap-1 rounded-xl border p-1.5 shadow-xl backdrop-blur-md"
            >
              {(["satellite", "streets", "blue", "dark"] as Basemap[]).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setBasemap(key);
                    setOpenBasemap(false);
                  }}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
                    basemap === key
                      ? "bg-[var(--brand)] text-white"
                      : "text-foreground hover:bg-foreground/5"
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  <span className="capitalize">
                    {key === "blue"
                      ? lang === "ar"
                        ? "فاتحة"
                        : "Light"
                      : key === "streets"
                        ? lang === "ar"
                          ? "شوارع"
                          : "Streets"
                        : key === "satellite"
                          ? props.satelliteVintage === "2016"
                            ? lang === "ar"
                              ? "قمر صناعي 2016"
                              : "Satellite 2016"
                            : lang === "ar"
                              ? "قمر صناعي"
                              : "Satellite"
                          : lang === "ar"
                            ? "داكنة"
                            : "Dark"}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
              <div className="relative mb-2 flex min-h-6 items-center justify-center">
                <MapIcon className="absolute start-0 h-3.5 w-3.5 text-[var(--brand)]" />
                <p className="px-6 text-center text-sm font-extrabold text-foreground">{t.map.layers}</p>
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
                      {l.type === "line" && (
                        <svg className="h-3 w-7 shrink-0 overflow-visible" viewBox="0 0 28 12" aria-hidden="true">
                          <line x1="1" y1="6" x2="27" y2="6" stroke={l.fixedColor} strokeWidth={l.weight ?? 3} strokeDasharray={l.dashArray} strokeDashoffset={l.dashOffset} strokeLinecap={l.lineCap ?? "round"} />
                        </svg>
                      )}
                      <span className="truncate" title={l.label}>{l.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend bottom-end */}
      {props.showLegend && props.legendItems && props.legendItems.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 right-3 top-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-col items-end justify-end gap-1.5 overflow-hidden">
          <AnimatePresence>
            {openLegend && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={`glass surface-hover pointer-events-auto flex min-h-0 max-w-full flex-col overflow-y-auto rounded-xl border p-2.5 sm:p-3 ${
                  props.legendType === "gradient"
                    ? "w-[min(250px,calc(100vw-2.25rem))]"
                    : "w-[min(250px,calc(100vw-2.25rem))]"
                }`}
              >
                {props.showLegend && props.legendItems && props.legendItems.length > 0 && (
                  <>
                    <p className="text-center text-sm font-black text-foreground">{props.legendTitle ?? t.map.legend}</p>
                    {props.legendHint && (
                      <p className="mt-1 text-center text-[9px] font-semibold leading-4 text-muted-foreground">{props.legendHint}</p>
                    )}
                    {props.legendType === "gradient" && (
                      <div className="my-2.5">
                        <div
                          className="h-4 rounded-full border border-border shadow-inner"
                          style={{ background: `linear-gradient(to ${dir === "rtl" ? "left" : "right"}, ${props.legendItems.map((item) => item.color).join(", ")})` }}
                        />
                        <div className="mt-1 flex justify-between text-[9px] font-extrabold text-muted-foreground">
                          <span>{lang === "ar" ? "أقل" : "Lower"}</span>
                          <span>{lang === "ar" ? "أعلى" : "Higher"}</span>
                        </div>
                      </div>
                    )}
                    <ul className="grid grid-cols-1 gap-1 pe-1 sm:gap-1.5">
                      {props.legendItems.map((it, i) => (
                        <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-border/70 bg-card/70 px-2 py-0.5 text-[10px] sm:py-1">
                          <span className="min-w-0 truncate text-right font-bold text-foreground/90" title={it.label}>{it.label}</span>
                          <span className="inline-block h-3.5 w-7 rounded-full border border-foreground/20" style={{ background: it.color }} />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setOpenLegend((value) => !value)}
            aria-label={t.map.legend}
            aria-expanded={openLegend}
            className={`glass surface-hover pointer-events-auto flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold text-foreground ${openLegend ? "border-[var(--brand)]/60 text-[var(--brand)]" : ""}`}
          >
            <MapIcon className="h-4 w-4" />
            {t.map.legend}
          </button>
        </div>
      )}
    </div>
  );
}
