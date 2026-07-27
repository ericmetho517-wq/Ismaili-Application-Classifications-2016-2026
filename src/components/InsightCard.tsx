import { motion } from "framer-motion";
import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Info } from "lucide-react";

type Tone = "positive" | "negative" | "warning" | "info";

const toneMap: Record<Tone, { ring: string; text: string; Icon: React.FC<any> }> = {
  positive: { ring: "border-emerald-400/40 from-emerald-400/15", text: "text-emerald-300", Icon: TrendingUp },
  negative: { ring: "border-rose-400/40 from-rose-400/15", text: "text-rose-300", Icon: TrendingDown },
  warning: { ring: "border-amber-400/40 from-amber-400/15", text: "text-amber-300", Icon: AlertTriangle },
  info: { ring: "border-cyan-400/40 from-cyan-400/15", text: "text-cyan-300", Icon: Info },
};

export function InsightCard({
  title,
  body,
  tone = "info",
  metric,
}: {
  title: string;
  body: string;
  tone?: Tone;
  metric?: string;
}) {
  const t = toneMap[tone];
  const Icon = t.Icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass surface-hover relative min-h-[116px] overflow-hidden rounded-lg border ${t.ring} bg-gradient-to-br to-transparent px-3 py-3`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 rounded-md bg-foreground/5 p-1.5 ${t.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="min-w-0 text-xs font-semibold leading-snug text-foreground">{title}</h4>
            {metric && (
              <span className={`shrink-0 text-[11px] font-bold ${t.text}`} dir="ltr">
                {metric}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.7] text-muted-foreground">{body}</p>
        </div>
      </div>
      <Lightbulb className="absolute -bottom-3 -end-3 h-12 w-12 text-foreground/5" />
    </motion.div>
  );
}
