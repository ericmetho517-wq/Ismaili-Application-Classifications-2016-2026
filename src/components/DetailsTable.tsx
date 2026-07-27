import { useMemo, useState } from "react";
import { ArrowDownUp, Search } from "lucide-react";
import { formatNum, useI18n } from "@/lib/i18n";
import type { DetailRow } from "@/lib/analytics";
import { translateValue } from "@/lib/labels";

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
      .slice(0, 80);
  }, [lang, query, rows, sort, unit]);

  return (
    <div className="flex h-full min-h-[260px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="glass flex min-w-0 basis-[220px] flex-1 items-center gap-2 rounded-md border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={lang === "ar" ? "بحث بالاسم أو النوع..." : "Search by name or type..."}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          onClick={() => setSort(sort === "area" ? "name" : "area")}
          className="glass inline-flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs text-foreground"
        >
          <ArrowDownUp className="h-3.5 w-3.5" />
          {sort === "area" ? (lang === "ar" ? "المساحة" : "Area") : lang === "ar" ? "الاسم" : "Name"}
        </button>
      </div>

      <div className="section-divider min-h-0 flex-1 overflow-auto rounded-lg border">
        <table className="w-full text-[11px]">
          <thead className="sticky top-0 z-10 border-b bg-card text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-start font-semibold">{lang === "ar" ? "الاسم" : "Name"}</th>
              <th className="px-2 py-2 text-start font-semibold">{lang === "ar" ? "النوع" : "Type"}</th>
              <th className="px-2 py-2 text-end font-semibold">{unit === "feddan" ? t.stats.feddan : t.stats.km2}</th>
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr
                key={row.id}
                onClick={() => onSelect?.(row)}
                className="section-divider cursor-pointer border-t text-foreground/90 transition-colors hover:bg-[var(--surface-hover)]"
              >
                <td className="max-w-[260px] truncate px-2 py-1.5 font-semibold">{translateValue(row.name, lang)}</td>
                <td className="max-w-[160px] truncate px-2 py-1.5 text-muted-foreground">{translateValue(row.type, lang)}</td>
                <td className="px-2 py-1.5 text-end font-bold" dir="ltr">
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
