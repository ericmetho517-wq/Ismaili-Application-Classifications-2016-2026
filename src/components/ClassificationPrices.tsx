import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadPricingSummary, type PricingSummaryGroup } from "@/lib/data";
import { type Metric } from "@/lib/analytics";
import {
  pricingDomain,
  type PricingDomain,
  type UnitPriceStats,
} from "@/lib/pricing";
import { formatNum, useI18n } from "@/lib/i18n";
import { MetricStrip } from "@/components/MetricStrip";

const domainTone: Record<PricingDomain, NonNullable<Metric["tone"]>> = {
  urban: "urban",
  agri: "agri",
  industrial: "industrial",
  services: "accent",
};

function summarizeGroups(groups: PricingSummaryGroup[]): UnitPriceStats {
  const count = groups.reduce((sum, group) => sum + group.count, 0);
  const areaM2 = groups.reduce((sum, group) => sum + group.area_m2, 0);
  const total2016 = groups.reduce((sum, group) => sum + group.price_2016, 0);
  const total2026 = groups.reduce((sum, group) => sum + group.price_2026, 0);
  const averageRate2016 = areaM2 > 0 ? total2016 / areaM2 : 0;
  const averageRate2026 = areaM2 > 0 ? total2026 / areaM2 : 0;

  return {
    count,
    areaM2,
    total2016,
    total2026,
    averageRate2016,
    averageRate2026,
    growth: averageRate2016 > 0 ? ((averageRate2026 - averageRate2016) / averageRate2016) * 100 : 0,
  };
}

function compactMoney(value: number, lang: "ar" | "en") {
  const absoluteValue = Math.abs(value);
  if (absoluteValue >= 1_000_000_000_000) {
    return `${formatNum(value / 1_000_000_000_000, lang, 2)} ${lang === "ar" ? "تريليون" : "tn"}`;
  }
  if (absoluteValue >= 1_000_000_000) {
    return `${formatNum(value / 1_000_000_000, lang, 2)} ${lang === "ar" ? "مليار" : "bn"}`;
  }
  if (absoluteValue >= 1_000_000) {
    return `${formatNum(value / 1_000_000, lang, 2)} ${lang === "ar" ? "مليون" : "m"}`;
  }
  return formatNum(value, lang, 0);
}

export function ClassificationPrices({
  domain,
}: {
  domain: PricingDomain;
}) {
  const { lang } = useI18n();
  const { data } = useQuery({ queryKey: ["pricing-summary"], queryFn: loadPricingSummary });
  const domainGroups = useMemo(
    () => (data?.groups ?? []).filter((group) => pricingDomain(group.use, group.land_use_code ?? undefined) === domain),
    [data, domain],
  );
  const stats = useMemo(() => summarizeGroups(domainGroups), [domainGroups]);
  const difference = stats.total2026 - stats.total2016;
  const metrics: Metric[] = [
    {
      label: lang === "ar" ? "إجمالي قيمة 2016" : "Total value 2016",
      value: compactMoney(stats.total2016, lang),
      unit: lang === "ar" ? "جنيه" : "EGP",
      tone: "brand",
    },
    {
      label: lang === "ar" ? "إجمالي قيمة 2026" : "Total value 2026",
      value: compactMoney(stats.total2026, lang),
      unit: lang === "ar" ? "جنيه" : "EGP",
      tone: domainTone[domain],
    },
    {
      label: lang === "ar" ? "الفرق بين 2016 و2026" : "Difference 2016–2026",
      value: `${difference >= 0 ? "+" : ""}${compactMoney(difference, lang)}`,
      tone: "accent",
    },
  ];

  if (!data) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{lang === "ar" ? "جاري تحميل الأسعار..." : "Loading prices..."}</p>;
  }

  return <MetricStrip metrics={metrics} compact />;
}
