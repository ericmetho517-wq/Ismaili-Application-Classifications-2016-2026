import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { Filter, RotateCcw } from "lucide-react";

export type FilterDef = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  filters,
  values,
  onChange,
  onReset,
}: {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, v: string) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass mb-4 flex flex-wrap items-center gap-3 rounded-xl p-3"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]">
        <Filter className="h-4 w-4" />
        {t.filters.title}
      </div>
      {filters.map((f) => (
        <div key={f.key} className="flex items-center gap-2">
          <label className="text-[11px] text-muted-foreground">{f.label}</label>
          <select
            value={values[f.key] ?? "__all__"}
            onChange={(e) => onChange(f.key, e.target.value)}
            className="rounded-md border border-border bg-input px-2 py-1 text-xs text-foreground focus:border-[var(--brand)] focus:outline-none"
          >
            <option value="__all__">{t.filters.all}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        onClick={onReset}
        className="ms-auto inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        <RotateCcw className="h-3 w-3" />
        {t.filters.reset}
      </button>
    </motion.div>
  );
}
