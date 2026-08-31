import { motion } from "framer-motion";
import { useI18n, formatNum, localizeDigits } from "@/lib/i18n";
import { TrendingUp, Sparkles } from "lucide-react";

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
  brand: "from-sky-500/20 via-sky-500/5 to-transparent border-sky-500/40 text-sky-400 shadow-[0_4px_20px_rgba(14,165,233,0.15)]",
  accent: "from-indigo-500/20 via-indigo-500/5 to-transparent border-indigo-500/40 text-indigo-400 shadow-[0_4px_20px_rgba(99,102,241,0.15)]",
  urban: "from-blue-500/20 via-blue-500/5 to-transparent border-blue-500/40 text-blue-400 shadow-[0_4px_20px_rgba(37,99,235,0.15)]",
  agri: "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/40 text-emerald-400 shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
  industrial: "from-purple-500/20 via-purple-500/5 to-transparent border-purple-500/40 text-purple-400 shadow-[0_4px_20px_rgba(168,85,247,0.15)]",
  water: "from-cyan-500/20 via-cyan-500/5 to-transparent border-cyan-500/40 text-cyan-400 shadow-[0_4px_20px_rgba(6,182,212,0.15)]",
};

export function StatCard({ label, value, unit, icon, accent = "brand", hint, onClick, selected }: Props) {
  const { lang } = useI18n();
  const display = typeof value === "number" ? formatNum(value, lang) : localizeDigits(value, lang);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
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
      className={`glass colorful-card surface-hover relative min-h-[110px] overflow-hidden rounded-2xl border bg-card px-3.5 py-3.5 transition-all ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-background shadow-lg" : ""}`}
    >
      {/* Animated Top Accent Glow Bar */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-75" />

      <div className="relative flex items-center justify-center gap-2">
        {icon && (
          <div className="absolute start-0 shrink-0 rounded-xl border border-current/30 bg-card/90 p-2 text-current shadow-md backdrop-blur-md">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1 px-8 text-center">
          <p className="line-clamp-2 min-h-10 text-center text-sm font-black leading-snug text-foreground/90 sm:text-base">
            {label}
          </p>
          <p
            className="mt-1.5 flex items-baseline justify-center gap-1.5 whitespace-nowrap text-[clamp(1.2rem,1.6vw,1.5rem)] font-black leading-tight tracking-tight text-foreground tabular-nums drop-shadow-sm"
            dir="rtl"
            title={String(display)}
          >
            <bdi dir="ltr">{display}</bdi>
            {unit && <span className="text-[12px] font-extrabold tracking-normal text-muted-foreground sm:text-xs">{unit}</span>}
          </p>
          {hint && (
            <p className="mt-1 line-clamp-2 text-[9.5px] font-bold leading-tight text-muted-foreground/85">
              {localizeDigits(hint, lang)}
            </p>
          )}
        </div>
      </div>
      <div className="absolute -bottom-8 -end-8 h-24 w-24 rounded-full bg-current opacity-10 blur-2xl pointer-events-none" />
    </motion.div>
  );
}
