import { motion } from "framer-motion";
import { useI18n, formatNum } from "@/lib/i18n";

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
  const display = typeof value === "number" ? formatNum(value, lang) : value;
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
      className={`glass surface-hover relative min-h-[92px] overflow-hidden rounded-xl border bg-gradient-to-br ${accentMap[accent]} px-3 py-2.5 ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-ring/80" : ""}`}
    >
      <div className="relative flex items-center justify-center gap-2">
        {icon && (
          <div className="absolute start-0 rounded-lg border border-border bg-card p-1.5 text-[var(--brand)] shadow-sm shrink-0">{icon}</div>
        )}
        <div className="min-w-0 flex-1 px-8 text-center">
          <p className="line-clamp-2 min-h-7 text-[11px] font-extrabold leading-tight text-muted-foreground">{label}</p>
          <p className="mt-2 whitespace-nowrap text-[clamp(1rem,1.35vw,1.3rem)] font-black leading-tight tracking-tight text-foreground tabular-nums" dir="ltr" title={String(display)}>
            <bdi>{display}</bdi>
            {unit && <span className="ms-1 text-[10px] font-bold text-muted-foreground">{unit}</span>}
          </p>
          {hint && <p className="mt-0.5 line-clamp-2 text-[8px] leading-tight text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="absolute -bottom-6 -end-6 h-20 w-20 rounded-full bg-foreground/5 blur-2xl" />
    </motion.div>
  );
}
