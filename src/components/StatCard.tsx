import { motion } from "framer-motion";
import { useI18n, formatNum, localizeDigits } from "@/lib/i18n";

type Props = {
  label: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
  accent?: "brand" | "accent" | "urban" | "agri" | "industrial" | "water";
  hint?: string;
  onClick?: () => void;
  selected?: boolean;
};

const accentMap: Record<NonNullable<Props["accent"]>, string> = {
  brand: "from-[var(--brand)]/30 to-[var(--brand)]/5 border-[var(--brand)]/40",
  accent: "from-[var(--brand-2)]/30 to-[var(--brand-2)]/5 border-[var(--brand-2)]/40",
  urban: "from-[var(--urban)]/30 to-[var(--urban)]/5 border-[var(--urban)]/40",
  agri: "from-[var(--agri)]/30 to-[var(--agri)]/5 border-[var(--agri)]/40",
  industrial: "from-[var(--industrial)]/30 to-[var(--industrial)]/5 border-[var(--industrial)]/40",
  water: "from-[var(--water)]/30 to-[var(--water)]/5 border-[var(--water)]/40",
};

export function StatCard({ label, value, unit, icon, accent = "brand", hint, onClick, selected }: Props) {
  const { lang } = useI18n();
  const display = typeof value === "number" ? formatNum(value, lang) : localizeDigits(value, lang);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`glass colorful-card surface-hover relative min-h-[104px] overflow-hidden rounded-xl border bg-gradient-to-br ${accentMap[accent]} px-3 py-3 ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-ring/80" : ""}`}
    >
      <div className="relative flex items-center justify-center gap-2">
        {icon && (
          <div className="absolute start-0 shrink-0 rounded-lg border border-[var(--card-accent)]/30 bg-card/80 p-1.5 text-[var(--card-accent)] shadow-sm">{icon}</div>
        )}
        <div className="min-w-0 flex-1 px-8 text-center">
          <p className="line-clamp-2 min-h-10 text-sm font-black leading-snug text-foreground/90">{label}</p>
          <p
            className="mt-2 flex items-baseline justify-center gap-2 whitespace-nowrap text-[clamp(1.1rem,1.5vw,1.4rem)] font-black leading-tight tracking-tight text-foreground tabular-nums"
            dir="rtl"
            title={String(display)}
          >
            <bdi dir="ltr">{display}</bdi>
            {unit && <span className="text-[13px] font-extrabold tracking-normal text-muted-foreground sm:text-sm">{unit}</span>}
          </p>
          {hint && <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-muted-foreground">{localizeDigits(hint, lang)}</p>}
        </div>
      </div>
      <div className="absolute -bottom-6 -end-6 h-20 w-20 rounded-full bg-foreground/5 blur-2xl" />
    </motion.div>
  );
}
