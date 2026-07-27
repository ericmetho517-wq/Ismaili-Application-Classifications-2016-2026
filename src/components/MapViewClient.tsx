"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { MapViewProps } from "./MapView";

const MapView = lazy(() => import("./MapView").then((m) => ({ default: m.MapView })));

function MapFallback({ height, shimmer = false }: { height?: string; shimmer?: boolean }) {
  return (
    <div
      className={`glass flex h-full items-center justify-center rounded-xl text-xs text-muted-foreground ${
        shimmer ? "shimmer" : ""
      }`}
      style={{ minHeight: height ?? "100%" }}
    >
      Loading map...
    </div>
  );
}

export function MapViewClient(props: MapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <MapFallback height={props.height} />;

  return (
    <Suspense fallback={<MapFallback height={props.height} shimmer />}>
      <MapView {...props} />
    </Suspense>
  );
}
