import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useI18n, formatNum } from "@/lib/i18n";

type Accent = "brand" | "accent" | "urban" | "agri" | "industrial" | "water";

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

const accentMap: Record<Accent, string> = {
  brand: "from-[var(--brand)]/25 to-[var(--brand)]/5 border-[var(--brand)]/40",
  accent: "from-[var(--brand-2)]/25 to-[var(--brand-2)]/5 border-[var(--brand-2)]/40",
  urban: "from-[var(--urban)]/25 to-[var(--urban)]/5 border-[var(--urban)]/40",
  agri: "from-[var(--agri)]/25 to-[var(--agri)]/5 border-[var(--agri)]/40",
  industrial: "from-[var(--industrial)]/25 to-[var(--industrial)]/5 border-[var(--industrial)]/40",
  water: "from-[var(--water)]/25 to-[var(--water)]/5 border-[var(--water)]/40",
};

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
      ? "text-[#087f5b]"
      : "text-[#b4233c]";
  const Icon = neutral ? Minus : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      className={`glass colorful-card surface-hover relative overflow-hidden rounded-xl border bg-gradient-to-br ${accentMap[accent]} px-3 py-2.5`}
    >
      <div className="relative flex items-center justify-center gap-2">
        {icon && (
          <div className="absolute start-0 shrink-0 rounded-lg border border-[var(--card-accent)]/30 bg-card/80 p-1.5 text-[var(--card-accent)] shadow-sm">{icon}</div>
        )}
        <p className="min-h-10 min-w-0 flex-1 px-9 text-center text-sm font-black leading-snug text-foreground line-clamp-2">
          {label}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-border/70 pt-2" dir="ltr">
        <div className="min-w-0 rounded-lg border border-border bg-card/75 px-2 py-2 text-center text-[10px] text-muted-foreground">
          <div className="font-bold">2016</div>
          <div className="mt-1 whitespace-nowrap text-sm font-extrabold tracking-tight text-foreground tabular-nums" title={formatNum(v2016, lang)}>{formatNum(v2016, lang)}</div>
        </div>
        <div className="min-w-0 rounded-lg border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-2 py-2 text-center text-[10px] text-muted-foreground">
          <div className="font-bold">2026</div>
          <div className="mt-1 whitespace-nowrap text-base font-black tracking-tight text-[var(--brand)] tabular-nums" title={formatNum(v2026, lang)}>{formatNum(v2026, lang)}</div>
        </div>
        <div className="min-w-0 rounded-lg border border-border bg-card/75 px-2 py-2 text-center text-[10px] text-muted-foreground">
          <div className="font-bold">{lang === "ar" ? "التغير" : "Change"}</div>
          <div className={`mt-1 flex items-center justify-center gap-0.5 whitespace-nowrap text-sm font-black tabular-nums ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
            <span>{(pct >= 0 ? "+" : "") + formatNum(pct, lang, 1)}%</span>
          </div>
        </div>
      </div>

      {unit && (
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1 text-[10px] text-muted-foreground">
          <span>{lang === "ar" ? "الفرق 2016–2026:" : "2016–2026 difference:"}</span>
          <bdi dir="ltr" className="font-extrabold text-foreground tabular-nums">{(delta >= 0 ? "+" : "") + formatNum(delta, lang)} {unit}</bdi>
        </p>
      )}
      <div className="absolute -bottom-6 -end-6 h-20 w-20 rounded-full bg-foreground/5 blur-2xl" />
    </motion.div>
  );
}
