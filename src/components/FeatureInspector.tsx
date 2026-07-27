import { formatNum, useI18n } from "@/lib/i18n";
import type { DetailRow } from "@/lib/analytics";
import { translateFieldLabel, translateValue } from "@/lib/labels";

const importantFields = [
  "وصف_الاستخدام",
  "نمط_العمران",
  "أنواع_المحاصيل_المزروعة",
  "نوع_ملكية_الأرض",
  "اسم_المسطح",
  "حالة_التغير",
  "سعر_الأرض_2026",
  "سعر_الأرض_2016",
  "سعر_الايجار_زراعية_2026",
  "سعر_الايجار_زراعية_2024",
  "فرق_السعر",
  "فرق_سعر_الايجار",
];

export function FeatureInspector({ row }: { row?: DetailRow }) {
  const { t, lang } = useI18n();
  if (!row) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border/70 px-4 text-center text-xs text-muted-foreground">
        {lang === "ar" ? "اختر عنصر من الجدول لعرض تفاصيله" : "Select a table row to view its details"}
      </div>
    );
  }

  const fields = importantFields
    .map((field) => [field, row.raw[field]] as const)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "");

  return (
    <div className="h-full min-h-[220px] overflow-auto rounded-lg border border-border/70 p-3">
      <p className="text-xs text-muted-foreground">{lang === "ar" ? "العنصر المحدد" : "Selected feature"}</p>
      <h4 className="mt-1 text-base font-bold text-foreground">{translateValue(row.name, lang)}</h4>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-foreground/5 p-2">
          <p className="text-[10px] text-muted-foreground">{t.common.area}</p>
          <p className="text-sm font-bold text-foreground" dir="ltr">
            {formatNum(row.area_km2, lang, 3)} {t.stats.km2}
          </p>
        </div>
        <div className="rounded-md bg-foreground/5 p-2">
          <p className="text-[10px] text-muted-foreground">{t.stats.feddan}</p>
          <p className="text-sm font-bold text-foreground" dir="ltr">
            {formatNum(row.feddan, lang, 1)}
          </p>
        </div>
      </div>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-3 border-b border-foreground/5 pb-1.5 text-xs">
          <dt className="text-muted-foreground">{t.layers.axis}</dt>
          <dd className="font-semibold text-foreground">{translateValue(row.axis, lang)}</dd>
        </div>
        {fields.map(([field, value]) => (
          <div key={field} className="flex justify-between gap-3 border-b border-foreground/5 pb-1.5 text-xs">
            <dt className="text-muted-foreground">{translateFieldLabel(field, lang)}</dt>
            <dd className="max-w-[58%] text-end font-semibold text-foreground">{translateValue(value, lang)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
