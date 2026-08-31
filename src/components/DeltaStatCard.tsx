import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type Accent = "brand" | "accent" | "urban" | "agri" | "industrial" | "water" | "desert" | "services";

type Props = {
  label: string;
  v2016: number;
  v2026: number;
  unit?: string;
  icon?: React.ReactNode;
  accent?: Accent;
  /** If true, growth is bad (e.g. vacant land, agricultural loss) */
  invert?: boolean;
};

const accentColor: Record<Accent, string> = {
  brand: "var(--brand)",
  accent: "var(--brand-2)",
  urban: "var(--urban)",
  agri: "var(--agri)",
  industrial: "var(--industrial)",
  water: "var(--water)",
  desert: "var(--desert)",
  services: "var(--muted-foreground)",
};

function formatExecutiveNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(Object.is(value, -0) ? 0 : value);
}

export function DeltaStatCard({
  label,
  v2016,
  v2026,
  unit,
  icon,
  accent = "brand",
  invert = false,
}: Props) {
  const { lang } = useI18n();
  const delta = v2026 - v2016;
  const pct = v2016 > 0 ? (delta / v2016) * 100 : v2026 > 0 ? 100 : 0;
  const positive = delta > 0;
  const negative = delta < 0;
  const neutral = !positive && !negative;
  const good = invert ? negative : positive;
  const tone = neutral
    ? "text-muted-foreground"
    : good
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className="glass colorful-card surface-hover relative overflow-hidden rounded-lg border bg-card px-3.5 pb-3 pt-4 shadow-sm"
      style={{ "--card-accent": accentColor[accent] } as React.CSSProperties}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[var(--card-accent)]" />
      <div className="relative flex items-center justify-center gap-2">
        {icon && (
          <div className="absolute start-0 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--card-accent)]/50 bg-card text-[var(--card-accent)] shadow-sm">{icon}</div>
        )}
        <p className="min-h-10 min-w-0 flex-1 px-10 text-center text-base font-black leading-snug text-foreground line-clamp-2">
          {label}
        </p>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border/80 pt-2.5" dir="ltr">
        <div className="min-w-0 rounded-lg border border-border/90 bg-black/[0.025] px-1.5 py-2.5 text-center dark:bg-white/[0.035]">
          <div className="text-xs font-extrabold text-muted-foreground">2016</div>
          <bdi dir="ltr" className="mt-1 block whitespace-nowrap font-sans text-base font-black leading-tight text-foreground tabular-nums xl:text-lg" title={formatExecutiveNumber(v2016)}>
            {formatExecutiveNumber(v2016)}
          </bdi>
          {unit && <div className="mt-1 text-[10px] font-bold text-muted-foreground">{unit}</div>}
        </div>
        <div className="min-w-0 rounded-lg border border-[var(--card-accent)]/60 bg-[var(--card-accent)]/[0.08] px-1.5 py-2.5 text-center">
          <div className="text-xs font-extrabold text-muted-foreground">2026</div>
          <bdi dir="ltr" className="mt-1 block whitespace-nowrap font-sans text-base font-black leading-tight text-[var(--card-accent)] tabular-nums xl:text-lg" title={formatExecutiveNumber(v2026)}>
            {formatExecutiveNumber(v2026)}
          </bdi>
          {unit && <div className="mt-1 text-[10px] font-bold text-muted-foreground">{unit}</div>}
        </div>
        <div className="min-w-0 rounded-lg border border-border/90 bg-black/[0.025] px-1.5 py-2.5 text-center dark:bg-white/[0.035]">
          <div className="text-xs font-extrabold text-muted-foreground">{lang === "ar" ? "التغير" : "Change"}</div>
          <div className={`mt-1 flex items-center justify-center gap-1 whitespace-nowrap font-sans text-base font-black leading-tight tabular-nums xl:text-lg ${tone}`} dir="ltr">
            <Icon className="h-4 w-4 shrink-0" />
            <bdi dir="ltr">{`${pct >= 0 ? "+" : ""}${formatExecutiveNumber(pct, 1)}%`}</bdi>
          </div>
          <div className="mt-1 text-[10px] font-bold text-muted-foreground">{lang === "ar" ? "نسبة مئوية" : "Percent"}</div>
        </div>
      </div>

      {unit && (
        <p className="mt-2.5 flex min-h-8 flex-wrap items-center justify-center gap-x-1 rounded-md border border-border/70 bg-black/[0.025] px-2 py-1.5 text-xs text-muted-foreground dark:bg-white/[0.035]">
          <span className="font-bold">{lang === "ar" ? "صافي التغير:" : "Net change:"}</span>
          <bdi dir="ltr" className="font-sans text-sm font-black text-foreground tabular-nums">{`${delta >= 0 ? "+" : ""}${formatExecutiveNumber(delta)}`}</bdi>
          <span className="font-extrabold text-foreground">{unit}</span>
        </p>
      )}
    </motion.div>
  );
}
