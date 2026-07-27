import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatNum, useI18n } from "@/lib/i18n";

export type PriceGroup = {
  name: string;
  count: number;
  rate2016: number;
  rate2026: number;
  growth: number;
  color?: string;
};

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
  fontSize: 11,
};

function short(value: string, length = 19) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export function PriceComparisonChart({
  data,
  height = 340,
}: {
  data: PriceGroup[];
  height?: number;
}) {
  const { lang } = useI18n();
  const oldLabel = lang === "ar" ? "سعر المتر 2016" : "2016 price / m²";
  const newLabel = lang === "ar" ? "سعر المتر 2026" : "2026 price / m²";
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart
        data={data.slice(0, 10)}
        layout="vertical"
        margin={{ top: 6, right: 18, left: 12, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} />
        <YAxis
          type="category"
          dataKey="name"
          width={124}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
          tickFormatter={(value) => short(String(value))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown, name: unknown) => [
            `${formatNum(Number(value), lang, 0)} ${lang === "ar" ? "جنيه/م²" : "EGP/m²"}`,
            String(name ?? ""),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="rate2016" name={oldLabel} fill="#7fc8ec" radius={[0, 3, 3, 0]} />
        <Bar dataKey="rate2026" name={newLabel} fill="#0b5ea8" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriceGrowthChart({ data, height = 300 }: { data: PriceGroup[]; height?: number }) {
  const { lang } = useI18n();
  const view = data
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, multiplier: 1 + item.growth / 100 }))
    .sort((a, b) => b.multiplier - a.multiplier);
  const multipleLabel = (value: unknown) => `×${formatNum(Number(value), lang, 1)}`;
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={view} layout="vertical" margin={{ top: 10, right: 74, left: 18, bottom: 16 }} barCategoryGap="28%">
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          type="number"
          domain={[0, "dataMax + 5"]}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
          tickFormatter={(value) => `×${formatNum(Number(value), lang, 0)}`}
          label={{
            value: lang === "ar" ? "سعر 2026 مقارنة بسعر 2016" : "2026 price relative to 2016",
            position: "insideBottom",
            offset: -10,
            fill: "var(--color-muted-foreground)",
            fontSize: 9,
          }}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tick={{ fill: "var(--color-foreground)", fontSize: 10, fontWeight: 700 }}
          tickFormatter={(value) => short(String(value), 28)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown, _name: unknown, item: any) => [
            `${multipleLabel(value)} · ${lang === "ar" ? "زيادة" : "increase"} ${formatNum(item?.payload?.growth ?? 0, lang, 1)}%`,
            lang === "ar" ? "مضاعف سعر المتر" : "Unit-price multiplier",
          ]}
        />
        <Bar dataKey="multiplier" radius={[0, 5, 5, 0]}>
          {view.map((item) => (
            <Cell key={item.name} fill={item.color ?? (item.growth >= 0 ? "#22c55e" : "#ef4444")} />
          ))}
          <LabelList dataKey="multiplier" position="right" formatter={multipleLabel} fill="var(--color-foreground)" fontSize={10} fontWeight={800} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriceBandChart({
  data,
  height = 290,
}: {
  data: Array<{ name: string; count2016: number; count2026: number }>;
  height?: number;
}) {
  const { lang } = useI18n();
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={data} margin={{ top: 12, right: 10, left: 0, bottom: 30 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="name"
          interval={0}
          angle={-18}
          textAnchor="end"
          height={54}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
        />
        <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown, name: unknown) => [
            formatNum(Number(value), lang, 0),
            String(name ?? ""),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="count2016" name="2016" fill="#7fc8ec" radius={[3, 3, 0, 0]} />
        <Bar dataKey="count2026" name="2026" fill="#0b5ea8" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
