import { USE_COLORS, CHANGE_COLORS, type ColorEntry } from "@/lib/colors";
import { useI18n } from "@/lib/i18n";

export function Legend({
  items,
  title,
}: {
  items: Array<{ color: string; label: string; sub?: string }>;
  title?: string;
}) {
  return (
    <div className="space-y-2">
      {title && <p className="text-xs font-semibold text-foreground">{title}</p>}
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-3 w-5 rounded-sm border border-foreground/20"
              style={{ background: it.color }}
            />
            <span className="text-foreground">{it.label}</span>
            {it.sub && <span className="ms-auto text-muted-foreground">{it.sub}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function useUseLegend(keys?: string[]) {
  const { lang } = useI18n();
  const entries: Array<[string, ColorEntry]> = Object.entries(USE_COLORS);
  const hidden = new Set(["أخرى", "غير محدد"]);
  const filtered = entries.filter(([key]) => !hidden.has(key) && (!keys || keys.includes(key)));
  return filtered.map(([_, v]) => ({
    color: v.color,
    label: lang === "ar" ? v.labelAr : v.labelEn,
  }));
}

export function useChangeLegend() {
  const { lang } = useI18n();
  return Object.values(CHANGE_COLORS).map((v) => ({
    color: v.color,
    label: lang === "ar" ? v.labelAr : v.labelEn,
  }));
}
