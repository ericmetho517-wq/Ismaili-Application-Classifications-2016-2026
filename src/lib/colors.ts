export type ColorEntry = { color: string; labelAr: string; labelEn: string };

export const MAP_COLORS = {
  studyArea: "#073b88",
  axisRoad: "#e31a1c",
  urban: "#f97316",
  agricultural: "#22c55e",
  industrial: "#a855f7",
  water: "#7dd3fc",
  vacant: "#f6c453",
  services: "#64748b",
} as const;

const UNSPECIFIED = "غير محدد";

export const USE_COLORS: Record<string, ColorEntry> = {
  "حضري / عمراني": { color: MAP_COLORS.urban, labelAr: "العمران", labelEn: "Urban" },
  "زراعي": { color: MAP_COLORS.agricultural, labelAr: "الزراعة", labelEn: "Agriculture" },
  "صناعي": { color: MAP_COLORS.industrial, labelAr: "الصناعة", labelEn: "Industrial" },
  "ارض فضاء": { color: MAP_COLORS.vacant, labelAr: "أرض فضاء", labelEn: "Vacant land" },
  "منطقة عسكرية": { color: MAP_COLORS.services, labelAr: "منطقة عسكرية", labelEn: "Military area" },
  "مطار": { color: MAP_COLORS.services, labelAr: "مطار", labelEn: "Airport" },
  "طرق": { color: MAP_COLORS.services, labelAr: "طرق", labelEn: "Roads" },
  "خدمات": { color: MAP_COLORS.services, labelAr: "الخدمات", labelEn: "Services" },
  "تجاري": { color: MAP_COLORS.services, labelAr: "تجاري", labelEn: "Commercial" },
  "مياه": { color: MAP_COLORS.services, labelAr: "مياه", labelEn: "Water" },
  "مقابر": { color: MAP_COLORS.services, labelAr: "مقابر", labelEn: "Cemetery" },
  "خضراء / غابات": { color: MAP_COLORS.services, labelAr: "خضراء / غابات", labelEn: "Green / Forest" },
  "محاجر": { color: MAP_COLORS.services, labelAr: "محاجر", labelEn: "Quarries" },
  "أخرى": { color: MAP_COLORS.services, labelAr: "أخرى", labelEn: "Other" },
  [UNSPECIFIED]: { color: MAP_COLORS.services, labelAr: UNSPECIFIED, labelEn: "Unspecified" },
};

export const DEFAULT_COLOR = "var(--muted-foreground)";

const NEW_GDB_CODE_MAP: Record<string, string> = {
  "0": "زراعي",
  "1": "صناعي",
  "2": "ارض فضاء",
  "3": "حضري / عمراني",
  "4": "منطقة عسكرية",
  "5": "خدمات",
  "6": "خدمات",
  "7": "خدمات",
  "8": "مياه",
  "10": "طرق",
  "11": "خدمات",
  "12": "خدمات",
  "13": "خدمات",
  "14": "خدمات",
  "15": "خضراء / غابات",
  "111": "خدمات",
};

function repairMojibake(value: string) {
  if (!/[ØÙ]/.test(value)) return value;
  try {
    const bytes = new Uint8Array([...value].map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[\u0600-\u06ff]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
}

function clean(raw: string | number | null | undefined) {
  if (raw === null || raw === undefined) return UNSPECIFIED;
  const s = repairMojibake(String(raw).trim());
  if (!s || s === "null" || s === "undefined") return UNSPECIFIED;
  return s;
}

export function canonicalUse(raw: string | number | null | undefined): string {
  const s = clean(raw);
  if (USE_COLORS[s]) return s;
  if (NEW_GDB_CODE_MAP[s]) return NEW_GDB_CODE_MAP[s];

  if (["سكني", "حضري", "حضرى", "عمراني", "عمران"].includes(s)) return "حضري / عمراني";
  if (["زراعي", "زراعى", "ارض زراعية", "أرض زراعية", "اراضي زراعية", "أراضي زراعية"].includes(s)) return "زراعي";
  if (["صناعي", "صناعى", "منطقة صناعية"].includes(s)) return "صناعي";
  if (["أرض فضاء", "ارض فضاء", "فضاء"].includes(s)) return "ارض فضاء";
  if (["مياه", "ماء", "مسطح مائي", "مسطح مائى"].includes(s)) return "مياه";
  if (["طريق", "طرق", "شوارع"].includes(s)) return "طرق";

  const low = s.toLowerCase();
  const has = (kw: string) => s.includes(kw) || low.includes(kw.toLowerCase());

  if (["ترع", "مصارف", "احواض مياه", "أحواض مياه", "بركة", "ابار مياه", "آبار مياه", "water", "canal", "drain"].some(has)) return "مياه";
  if (["ارض زراعية", "أرض زراعية", "صوب زراعية", "مزارع", "محاصيل", "زراع", "agri", "farm"].some(has)) return "زراعي";
  if (["مسطحات خضراء", "حديقة", "غابة", "غابات", "green", "forest"].some(has)) return "خضراء / غابات";
  if (["مقبرة", "مقابر", "cemetery"].some(has)) return "مقابر";
  if (["مطار", "airport"].some(has)) return "مطار";
  if (["محجر", "مقلع", "quarry", "mine"].some(has)) return "محاجر";
  if (["طريق", "road", "شارع", "نفق", "انفاق", "سكة حديد"].some(has)) return "طرق";
  if (["مستشفى", "medical", "مدرسة", "مدارس", "جامعة", "كلية", "نادي", "مسجد", "كنيسة", "محطة", "معالجة", "صرف"].some(has)) return "خدمات";
  if (["مول", "سوق", "فندق", "outlet", "market", "hotel"].some(has)) return "تجاري";
  if (["مصنع", "شركة", "مصانع", "صناع", "factory", "industries", "industrial", "warehouse", "plastic", "textile", "cement", "steel", "مخزن", "مخازن", "ورشة", "مجمع"].some(has)) return "صناعي";

  return "أخرى";
}

export function colorFor(key: string | number | null | undefined): string {
  const k = canonicalUse(key);
  return USE_COLORS[k]?.color ?? DEFAULT_COLOR;
}

export function labelFor(key: string | number | null | undefined, lang: "ar" | "en"): string {
  const k = canonicalUse(key);
  const entry = USE_COLORS[k];
  if (!entry) return k;
  return lang === "ar" ? entry.labelAr : entry.labelEn;
}

export const CHANGE_COLORS: Record<string, ColorEntry> = {
  "1": { color: "#ef4444", labelAr: "يوجد تغير", labelEn: "Changed" },
  "2": { color: "#22c55e", labelAr: "لا يوجد تغير", labelEn: "No change" },
};

export function changeColor(k: string | null | undefined) {
  if (!k) return DEFAULT_COLOR;
  const value = String(k);
  if (value === "3" || value === "4") return CHANGE_COLORS["1"].color;
  return CHANGE_COLORS[value]?.color ?? DEFAULT_COLOR;
}

export function changeLabel(k: string | null | undefined, lang: "ar" | "en") {
  if (!k) return lang === "ar" ? UNSPECIFIED : "Unspecified";
  const value = String(k);
  if (value === "1" || value === "3" || value === "4") return lang === "ar" ? "يوجد تغير" : "Changed";
  if (value === "2") return lang === "ar" ? "لا يوجد تغير" : "No change";
  return String(k);
}
