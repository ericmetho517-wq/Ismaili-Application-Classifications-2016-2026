// Client-side data loader (fetches static GeoJSON from /data/*)
import type { FeatureCollection, Geometry } from "geojson";
import { canonicalUse } from "@/lib/colors";

export type LayerKey =
  | "LandCover"
  | "Study_Area_Sector"
  | "Axis_Road_Sector"
  | "Road_CairoRing"
  | "Road_MiddleRing"
  | "Road_RegionalRing"
  | "Land_Cover2016"
  | "Land_Cover2026"
  | "Land_Cover_Area_Compare"
  | "Urban_Changes"
  | "Agricultural_Changes"
  | "Industrial_Changes"
  | "Water_Changes"
  | "Transit_GreenLine"
  | "Transit_Metro1"
  | "Transit_Metro2"
  | "Transit_Metro3"
  | "Transit_Metro4"
  | "Transit_Metro6"
  | "Transit_LRT"
  | "Transit_MonorailOctober"
  | "Transit_MonorailCapital"
  | "Transit_RobikiBelbeis"
  | "Transit_KafrDawoodSadat";

export type AnyFC = FeatureCollection<Geometry, Record<string, any>>;

const cache = new Map<string, Promise<AnyFC>>();
const mapCache = new Map<string, Promise<AnyFC>>();
const TRANSPORT_DATA_VERSION = "study-area-20260824-2";
const TRANSPORT_KEYS = new Set<LayerKey>([
  "Road_CairoRing",
  "Road_MiddleRing",
  "Road_RegionalRing",
  "Transit_Metro1",
  "Transit_Metro3",
  "Transit_Metro4",
  "Transit_LRT",
  "Transit_MonorailCapital",
  "Transit_RobikiBelbeis",
]);

function dataUrl(path: string, key: LayerKey) {
  return TRANSPORT_KEYS.has(key) ? `${path}?v=${TRANSPORT_DATA_VERSION}` : path;
}

function fetchOptions(key: LayerKey): RequestInit | undefined {
  return TRANSPORT_KEYS.has(key) ? { cache: "no-store" } : undefined;
}

export function loadLayer(key: LayerKey): Promise<AnyFC> {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(dataUrl(`/data/${key}.geojson`, key), fetchOptions(key)).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${key}`);
        return r.json();
      }),
    );
  }
  return cache.get(key)!;
}

export function loadMapLayer(key: LayerKey): Promise<AnyFC> {
  if (!mapCache.has(key)) {
    mapCache.set(
      key,
      fetch(dataUrl(`/data/map/${key}.geojson`, key), fetchOptions(key)).then((response) => {
        if (response.ok) return response.json();
        return loadLayer(key);
      }),
    );
  }
  return mapCache.get(key)!;
}

export type PricingRow = {
  id: string;
  use: string;
  land_use_code: number;
  area_m2: number;
  price_2016: number;
  price_2026: number;
};

export type PricingData = { total_features: number; rows: PricingRow[] };

export type PricingSummaryGroup = {
  use: string;
  land_use_code: number | null;
  count: number;
  area_m2: number;
  price_2016: number;
  price_2026: number;
};

export type PricingSummaryData = { total_features: number; groups: PricingSummaryGroup[] };

let pricingCache: Promise<PricingData> | null = null;
export function loadPricingData(): Promise<PricingData> {
  if (!pricingCache) {
    pricingCache = fetch("/data/pricing.json").then((response) => {
      if (!response.ok) throw new Error("Failed to load pricing data");
      return response.json();
    });
  }
  return pricingCache;
}

let pricingSummaryCache: Promise<PricingSummaryData> | null = null;
export function loadPricingSummary(): Promise<PricingSummaryData> {
  if (!pricingSummaryCache) {
    pricingSummaryCache = fetch("/data/pricing-summary.json").then((response) => {
      if (!response.ok) throw new Error("Failed to load pricing summary");
      return response.json();
    });
  }
  return pricingSummaryCache;
}

export type SummaryItem = { name: string; area_km2: number; count: number };
export type Summary = {
  land_cover_2016: SummaryItem[];
  land_cover_2026: SummaryItem[];
  urban_by_type: SummaryItem[];
  agricultural_by_crop: SummaryItem[];
  agricultural_by_ownership: SummaryItem[];
  industrial_by_desc: SummaryItem[];
  water_by_name: SummaryItem[];
  change_status_2026: SummaryItem[];
  totals: {
    study_area_km2: number;
    axis_length_km: number;
    urban_count: number;
    agri_count: number;
    industrial_count: number;
    water_count: number;
    urban_area_km2: number;
    agri_area_km2: number;
    industrial_area_km2: number;
    water_area_km2: number;
  };
};

let summaryCache: Promise<Summary> | null = null;
export function loadSummary(): Promise<Summary> {
  if (!summaryCache) {
    summaryCache = fetch("/data/summary.json").then((r) => r.json());
  }
  return summaryCache;
}

/** Look up a category area (km²) by canonical Arabic name from a land_cover array. */
export function pickArea(arr: SummaryItem[] | undefined, name: string): number {
  const target = canonicalUse(name);
  return arr?.find((d) => canonicalUse(d.name) === target)?.area_km2 ?? 0;
}
export function pickCount(arr: SummaryItem[] | undefined, name: string): number {
  const target = canonicalUse(name);
  return arr?.find((d) => canonicalUse(d.name) === target)?.count ?? 0;
}
