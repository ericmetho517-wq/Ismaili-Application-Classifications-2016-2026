import { useMemo, useState } from "react";
import { ArrowDownUp, Search, Table as TableIcon } from "lucide-react";
import { formatNum, useI18n } from "@/lib/i18n";
import type { DetailRow } from "@/lib/analytics";
import { translateValue } from "@/lib/labels";
import { motion } from "framer-motion";

export function DetailsTable({
  rows,
  unit = "km2",
  onSelect,
}: {
  rows: DetailRow[];
  unit?: "km2" | "feddan";
  onSelect?: (row: DetailRow) => void;
}) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"area" | "name">("area");

  const view = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!q) return true;
        return [
          row.name,
          row.type,
          row.axis,
          translateValue(row.name, lang),
          translateValue(row.type, lang),
          translateValue(row.axis, lang),
        ].some((value) => value.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        if (sort === "name") return translateValue(a.name, lang).localeCompare(translateValue(b.name, lang));
        return unit === "feddan" ? b.feddan - a.feddan : b.area_km2 - a.area_km2;
      })
      .slice(0, 100);
  }, [lang, query, rows, sort, unit]);

  return (
    <div className="flex h-full min-h-[260px] flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="glass flex min-w-0 basis-[220px] flex-1 items-center gap-2 rounded-xl border border-sky-500/30 px-3 py-2 text-xs shadow-sm transition-all focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/20">
          <Search className="h-3.5 w-3.5 text-sky-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={lang === "ar" ? "بحث فوري بالاسم أو النوع..." : "Instant search..."}
            className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-[11px] font-black text-sky-400 border border-sky-500/20">
            {view.length} {lang === "ar" ? "سجل" : "records"}
          </span>
          <button
            onClick={() => setSort(sort === "area" ? "name" : "area")}
            className="glass surface-hover inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-black text-foreground shadow-sm hover:border-sky-400/50"
          >
            <ArrowDownUp className="h-3.5 w-3.5 text-sky-400" />
            {sort === "area" ? (lang === "ar" ? "ترتيب بالمساحة" : "Area") : lang === "ar" ? "ترتيب بالاسم" : "Name"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/80 shadow-inner">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 border-b border-border/80 bg-card/95 backdrop-blur-md text-foreground">
            <tr>
              <th className="px-3 py-2.5 text-start font-black">{lang === "ar" ? "الاسم المعياري" : "Name"}</th>
              <th className="px-3 py-2.5 text-start font-black">{lang === "ar" ? "تصنيف الاستخدام" : "Type"}</th>
              <th className="px-3 py-2.5 text-end font-black">{unit === "feddan" ? t.stats.feddan : t.stats.km2}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {view.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => onSelect?.(row)}
                className="cursor-pointer text-foreground/90 transition-all hover:bg-sky-500/10 hover:text-foreground"
              >
                <td className="max-w-[260px] truncate px-3 py-2 font-bold">{translateValue(row.name, lang)}</td>
                <td className="max-w-[160px] truncate px-3 py-2 font-semibold text-muted-foreground">{translateValue(row.type, lang)}</td>
                <td className="px-3 py-2 text-end font-black text-sky-400" dir="ltr">
                  {formatNum(unit === "feddan" ? row.feddan : row.area_km2, lang, unit === "feddan" ? 1 : 3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
