import type { LayerKey } from "@/lib/data";
import { canonicalUse } from "@/lib/colors";
import { FIELDS, featureAreaKm2 } from "@/lib/analytics";
import { X } from "lucide-react";

export type MapFilter = {
  label: string;
  layerKeys: LayerKey[];
  predicate: (key: LayerKey, props: Record<string, any>) => boolean;
};

export function toggleFilter(
  current: MapFilter | null,
  next: MapFilter,
  setFilter: (filter: MapFilter | null) => void,
) {
  setFilter(current?.label === next.label ? null : next);
}

export function FilterChip({ filter, onClear }: { filter: MapFilter | null; onClear: () => void }) {
  if (!filter) return null;
  return (
    <div className="mb-2 flex justify-end">
      <div className="glass inline-flex max-w-full items-center gap-2 rounded-md border px-2 py-1 text-xs text-foreground">
        <span className="truncate">{filter.label}</span>
        <button
          type="button"
          onClick={onClear}
          className="inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground/10 text-muted-foreground hover:text-foreground"
          aria-label="إلغاء الفلتر"
          title="إلغاء الفلتر"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function landUseFilter(label: string, layerKeys: LayerKey[], rawName: string): MapFilter {
  const target = canonicalUse(rawName);
  return {
    label,
    layerKeys,
    predicate: (key, props) => {
      if (!layerKeys.includes(key)) return true;
      return canonicalUse(props[FIELDS.useDesc] ?? props[FIELDS.useCode]) === target;
    },
  };
}

type MapFilterFn = (key: LayerKey, props: Record<string, any>) => boolean;

const passAllMapFeatures: MapFilterFn = () => true;
const mapFilterFunctions = new WeakMap<MapFilter, MapFilterFn>();

export function applyMapFilter(filter: MapFilter | null) {
  // Keep the callback reference stable between React renders. MapView uses a
  // callback change as the signal to rebuild its GeoJSON layers; returning a
  // new function every render caused a clear/reload loop before layers and
  // charts could finish painting.
  if (!filter) return passAllMapFeatures;

  const cached = mapFilterFunctions.get(filter);
  if (cached) return cached;

  const filterFeatures: MapFilterFn = (key, props) => {
    if (!filter || !filter.layerKeys.includes(key)) return true;
    return filter.predicate(key, props);
  };
  mapFilterFunctions.set(filter, filterFeatures);
  return filterFeatures;
}

export function fieldFilter(
  label: string,
  layerKey: LayerKey,
  field: string,
  value: unknown,
): MapFilter {
  const target = String(value ?? "");
  return {
    label,
    layerKeys: [layerKey],
    predicate: (key, props) => {
      if (key !== layerKey) return true;
      return String(props[field] ?? "") === target;
    },
  };
}

export function bucketFilter(
  label: string,
  layerKey: LayerKey,
  unit: "km2" | "m2" | "feddan",
  min: number,
  max: number,
): MapFilter {
  return {
    label,
    layerKeys: [layerKey],
    predicate: (key, props) => {
      if (key !== layerKey) return true;
      const km2 = featureAreaKm2(props);
      const value =
        unit === "m2"
          ? km2 * 1_000_000
          : unit === "feddan"
            ? Number(props[FIELDS.feddan] ?? km2 * 247.105)
            : km2;
      return value >= min && value < max;
    },
  };
}

export function rowFilter(
  label: string,
  layerKey: LayerKey,
  row: { id: string; name: string; type: string; area_km2: number },
) {
  return {
    label,
    layerKeys: [layerKey],
    predicate: (key, props) => {
      if (key !== layerKey) return true;
      if (props.GlobalID && row.id && String(props.GlobalID) === String(row.id)) return true;
      const area = featureAreaKm2(props);
      return (
        (String(
          props[FIELDS.useDesc] ??
            props[FIELDS.urbanType] ??
            props[FIELDS.crop] ??
            props[FIELDS.waterName] ??
            "",
        ) === row.name ||
          String(
            props[FIELDS.useDesc] ??
              props[FIELDS.urbanType] ??
              props[FIELDS.crop] ??
              props[FIELDS.waterName] ??
              "",
          ) === row.type) &&
        Math.abs(area - row.area_km2) < 0.000001
      );
    },
  } satisfies MapFilter;
}
