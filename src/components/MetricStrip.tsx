import { Activity, BarChart3, Gauge, Maximize2, Ruler, Sigma } from "lucide-react";
import { formatNum, localizeDigits, useI18n } from "@/lib/i18n";
import type { Metric } from "@/lib/analytics";
import { translateMetricLabel, unitLabel } from "@/lib/labels";

const icons = [Sigma, Activity, Gauge, BarChart3, Maximize2, Ruler];

const toneClass: Record<NonNullable<Metric["tone"]>, string> = {
  brand: "border-sky-500/40 bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent text-sky-400 shadow-[0_4px_16px_rgba(14,165,233,0.1)]",
  accent: "border-indigo-500/40 bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-transparent text-indigo-400 shadow-[0_4px_16px_rgba(99,102,241,0.1)]",
  urban: "border-blue-500/40 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent text-blue-400 shadow-[0_4px_16px_rgba(37,99,235,0.1)]",
  agri: "border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-400 shadow-[0_4px_16px_rgba(16,185,129,0.1)]",
  industrial: "border-purple-500/40 bg-gradient-to-br from-purple-500/15 via-purple-500/5 to-transparent text-purple-400 shadow-[0_4px_16px_rgba(168,85,247,0.1)]",
  water: "border-cyan-500/40 bg-gradient-to-br from-cyan-500/15 via-cyan-500/5 to-transparent text-cyan-400 shadow-[0_4px_16px_rgba(6,182,212,0.1)]",
};

export function MetricStrip({ metrics, compact = false }: { metrics: Metric[]; compact?: boolean }) {
  const { lang } = useI18n();
  if (!metrics.length) {
    return <p className="text-xs text-muted-foreground">{lang === "ar" ? "لا توجد مؤشرات متاحة" : "No metrics available"}</p>;
  }

  return (
    <div className={`grid gap-3 ${compact ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-6"}`}>
      {metrics.map((metric, index) => {
        const Icon = icons[index % icons.length];
        const display =
          typeof metric.value === "number"
            ? formatNum(metric.value, lang, metric.value > 100 ? 0 : 2)
            : localizeDigits(translateMetricLabel(metric.value, lang), lang);
        return (
          <div
            key={`${metric.label}-${index}`}
            className={`glass surface-hover relative overflow-hidden border transition-all ${
              compact ? "flex min-h-[155px] items-center justify-center rounded-2xl px-5 py-5" : "rounded-xl px-3 py-2.5"
            } ${toneClass[metric.tone ?? "brand"]}`}
          >
            <div className={`relative flex w-full justify-center ${compact ? "flex-col items-center" : "items-start gap-2"}`}>
              <span className={compact ? "mb-3 grid h-10 w-10 place-items-center rounded-xl border border-current/25 bg-current/10" : ""}>
                <Icon className={compact ? "h-5 w-5 shrink-0" : "absolute start-0 top-0.5 h-4 w-4 shrink-0 opacity-80"} />
              </span>
              <div className={`min-w-0 flex-1 text-center ${compact ? "w-full" : "px-6"}`}>
                <p className={`line-clamp-2 text-center font-black text-foreground/90 ${compact ? "text-base leading-relaxed sm:text-lg" : "min-h-9 text-sm leading-snug"}`}>
                  {translateMetricLabel(metric.label, lang)}
                </p>
                <p
                  className={`flex flex-wrap items-baseline justify-center gap-x-2 gap-y-1 font-black tracking-tight text-foreground tabular-nums drop-shadow-sm ${
                    compact ? "mt-3 text-[clamp(1.4rem,2vw,1.9rem)] leading-tight" : "mt-1 whitespace-nowrap text-[clamp(1.05rem,1.3vw,1.25rem)]"
                  }`}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  title={String(display)}
                >
                  <bdi>{display}</bdi>
                  {metric.unit && (
                    <span className={`${compact ? "text-sm sm:text-base" : "text-[11px]"} font-extrabold tracking-normal text-muted-foreground`}>
                      {unitLabel(metric.unit, lang)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            {metric.hint && (
              <p className="mt-1 line-clamp-2 text-center text-[9px] font-semibold leading-tight text-muted-foreground/80">
                {translateMetricLabel(metric.hint, lang)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
