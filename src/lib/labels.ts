import { labelFor } from "@/lib/colors";

function repairMojibake(value: unknown) {
  const text = String(value ?? "");
  if (!/[ÃƒÃ˜Ã™]/.test(text)) return text;
  try {
    const bytes = new Uint8Array([...text].map((ch) => ch.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return /[\u0600-\u06ff]/.test(decoded) ? decoded : text;
  } catch {
    return text;
  }
}

function clean(value: unknown) {
  return repairMojibake(value).replace(/\s+/g, " ").trim();
}

const valueMap: Record<string, string> = {
  "غير محدد": "Unspecified",
  "سكني": "Residential",
  "حضري": "Urban",
  "عمراني": "Urban",
  "صناعي": "Industrial",
  "زراعي": "Agricultural",
  "ارض زراعية": "Agricultural land",
  "أرض زراعية": "Agricultural land",
  "صوب زراعية": "Greenhouses",
  "خدمات": "Services",
  "تجاري": "Commercial",
  "طرق": "Roads",
  "مياه": "Water",
  "مطار": "Airport",
  "مقابر": "Cemetery",
  "محاجر": "Quarries",
  "أخرى": "Other",
  "اخرى": "Other",
  "ارض فضاء": "Vacant land",
  "أرض فضاء": "Vacant land",
  "منطقة عسكرية": "Military area",
  "اسكان مخطط اقتصادى": "Planned economic housing",
  "اسكان مخطط اقتصادي": "Planned economic housing",
  "اسكان اجتماعي شباب": "Youth social housing",
  "اسكان اجتماعي شب": "Youth social housing",
  "اسكان عشوائي": "Informal housing",
  "كمبوند": "Compound",
  "تمليك": "Freehold",
  "ايجار": "Leasehold",
  "إيجار": "Leasehold",
  "خضراوات و فواكه و حبوب": "Vegetables, fruits and grains",
  "خضروات و فواكه و حبوب": "Vegetables, fruits and grains",
  "خضراوات": "Vegetables",
  "فواكه": "Fruits",
  "حبوب": "Grains",
  "مخزن": "Warehouse",
  "مخازن": "Warehouses",
  "مصنع": "Factory",
  "شركة": "Company",
  "الإسماعيلية": "Ismailia",
};

const fieldMap: Record<string, string> = {
  "وصف_الاستخدام": "Use description",
  "استخدام_الأرض": "Land use",
  "نمط_العمران": "Urban pattern",
  "أنواع_المحاصيل_المزروعة": "Crops",
  "نوع_ملكية_الأرض": "Land ownership",
  "اسم_المسطح": "Water body name",
  "حالة_التغير": "Change status",
  "سعر_الأرض_2026": "Land price 2026",
  "سعر_الأرض_2016": "Land price 2016",
  "سعر_الايجار_زراعية_2026": "Agricultural rent 2026",
  "سعر_الايجار_زراعية_2024": "Agricultural rent 2024",
  "فرق_السعر": "Price difference",
  "فرق_سعر_الايجار": "Rent difference",
  "اسم_المحور": "Axis",
  "اسم_القطاع": "Sector",
  "المساحة_كم2": "Area",
  "مساحة_كم2": "Area",
  "مساحة_التغير_كم2": "Change area",
  "مساحة_التغير_بالمتر": "Change area",
  "المساحة_فدان": "Area in feddans",
};

export function translateValue(value: unknown, lang: "ar" | "en") {
  const text = clean(value);
  if (lang === "ar") return text;
  if (!text) return "";
  if (valueMap[text]) return valueMap[text];

  const landUse = labelFor(text, "en");
  if (landUse && landUse !== "Other") return landUse;

  if (/^\d+$/.test(text)) return text;
  if (/[\u0600-\u06ff]/.test(text)) {
    if (text.includes("اسكان")) return text.replace("اسكان", "Housing");
    if (text.includes("مخزن")) return "Warehouse";
    if (text.includes("مصنع")) return "Factory";
    if (text.includes("شركة")) return "Company";
  }
  return text;
}

export function translateFieldLabel(value: unknown, lang: "ar" | "en") {
  const text = clean(value);
  if (lang === "ar") return text.replace(/_/g, " ");
  return fieldMap[text] ?? text.replace(/_/g, " ");
}

export function translateMetricLabel(value: unknown, lang: "ar" | "en") {
  const text = clean(value);
  if (lang === "ar") return text;
  const medianHint = text.match(/^وسيط\s+(.+?)\s+·\s+(.+?)\s+عنصر$/);
  if (medianHint) return `Median ${medianHint[1]} · ${medianHint[2]} features`;
  return (
    {
      "إجمالي العمران": "Total urban area",
      "إجمالي الزراعة": "Total agricultural area",
      "إجمالي الصناعة": "Total industrial area",
      "إجمالي العناصر": "Total area",
      "عدد العناصر": "Features",
      "متوسط المساحة": "Average area",
      "الوسيط": "Median",
      "أكبر عنصر": "Largest feature",
      "تركيز أعلى 10%": "Top 10% concentration",
      "بيانات الأسعار": "Price data",
      "غير متاحة": "Unavailable",
      "متوسط سعر الأرض 2026": "Average land price 2026",
      "متوسط سعر الأرض 2016": "Average land price 2016",
      "متوسط إيجار زراعي 2026": "Average agricultural rent 2026",
      "متوسط إيجار زراعي 2024": "Average agricultural rent 2024",
    }[text] ?? text
  );
}

export function unitLabel(unit: string | undefined, lang: "ar" | "en") {
  if (!unit) return unit;
  const text = clean(unit);
  if (lang === "ar") return text;
  if (text === "كم²" || text === "ÙƒÙ…Â²") return "km²";
  if (text === "فدان" || text === "ÙØ¯Ø§Ù†") return "feddan";
  if (text === "جنيه" || text === "Ø¬Ù†ÙŠÙ‡") return "EGP";
  return text;
}
