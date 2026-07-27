import { Activity, BarChart3, Gauge, Maximize2, Ruler, Sigma } from "lucide-react";
import { formatNum, useI18n } from "@/lib/i18n";
import type { Metric } from "@/lib/analytics";
import { translateMetricLabel, unitLabel } from "@/lib/labels";

const icons = [Sigma, Activity, Gauge, BarChart3, Maximize2, Ruler];

const toneClass: Record<NonNullable<Metric["tone"]>, string> = {
  brand: "border-[var(--brand)]/40 bg-[var(--brand)]/10",
  accent: "border-[var(--brand-2)]/40 bg-[var(--brand-2)]/10",
  urban: "border-[var(--urban)]/40 bg-[var(--urban)]/10",
  agri: "border-[var(--agri)]/40 bg-[var(--agri)]/10",
  industrial: "border-[var(--industrial)]/40 bg-[var(--industrial)]/10",
  water: "border-[var(--water)]/40 bg-[var(--water)]/10",
};

export function MetricStrip({ metrics, compact = false }: { metrics: Metric[]; compact?: boolean }) {
  const { lang } = useI18n();
  if (!metrics.length) {
    return <p className="text-xs text-muted-foreground">{lang === "ar" ? "لا توجد مؤشرات متاحة" : "No metrics available"}</p>;
  }
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6"}`}>
      {metrics.map((metric, index) => {
        const Icon = icons[index % icons.length];
        const display =
          typeof metric.value === "number"
            ? formatNum(metric.value, lang, metric.value > 100 ? 0 : 2)
            : translateMetricLabel(metric.value, lang);
        return (
          <div
            key={`${metric.label}-${index}`}
            className={`surface-hover rounded-lg border px-2.5 py-2 ${toneClass[metric.tone ?? "brand"]}`}
          >
            <div className="relative flex items-start justify-center gap-2">
              <Icon className="absolute start-0 top-0 h-4 w-4 shrink-0 text-foreground/70" />
              <div className="min-w-0 flex-1 px-7 text-center">
                <p className="line-clamp-2 min-h-7 text-[11px] font-semibold leading-tight text-muted-foreground">
                  {translateMetricLabel(metric.label, lang)}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[clamp(0.9rem,1.15vw,1rem)] font-extrabold tracking-tight text-foreground tabular-nums" dir="ltr" title={String(display)}>
                  <bdi>{display}</bdi>
                  {metric.unit && <span className="ms-1 text-[10px] font-medium text-muted-foreground">{unitLabel(metric.unit, lang)}</span>}
                </p>
              </div>
            </div>
            {metric.hint && (
              <p className="mt-1 line-clamp-2 text-center text-[9px] leading-tight text-muted-foreground">{translateMetricLabel(metric.hint, lang)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
