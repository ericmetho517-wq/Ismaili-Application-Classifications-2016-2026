// Client-side data loader (fetches static GeoJSON from /data/*)
import type { FeatureCollection, Geometry } from "geojson";
import { canonicalUse } from "@/lib/colors";

export type LayerKey =
  | "LandCover"
  | "Study_Area_Sector"
  | "Axis_Road_Sector"
  | "Land_Cover2016"
  | "Land_Cover2026"
  | "Land_Cover_Area_Compare"
  | "Urban_Changes"
  | "Agricultural_Changes"
  | "Industrial_Changes"
  | "Water_Changes"
  | "Metro_Station"
  | "Metro_Line"
  | "lRT_Station"
  | "LRT_Line";

export type AnyFC = FeatureCollection<Geometry, Record<string, any>>;

const cache = new Map<string, Promise<AnyFC>>();
const mapCache = new Map<string, Promise<AnyFC>>();

export function loadLayer(key: LayerKey): Promise<AnyFC> {
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/data/${key}.geojson`).then((r) => {
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
      fetch(`/data/map/${key}.geojson`).then((response) => {
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
  area_m2: number;
  price_2016: number;
  price_2026: number;
};

export type PricingData = { total_features: number; rows: PricingRow[] };

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
