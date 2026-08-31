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
  rawName?: string;
  count: number;
  rate2016: number;
  rate2026: number;
  growth: number;
  color?: string;
};

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
  fontWeight: 700,
  boxShadow: "0 10px 24px rgba(0,0,0,0.3)",
};

const chartText = "var(--foreground)";
const chartMutedText = "var(--muted-foreground)";
const chartGrid = "color-mix(in oklch, var(--foreground) 22%, transparent)";

function short(value: string, length = 19) {
  return value.length > length ? `${value.slice(0, length)}…` : value;
}

export function PriceComparisonChart({
  data,
  height = 340,
  selectedKey,
  onSelect,
}: {
  data: PriceGroup[];
  height?: number;
  selectedKey?: string | null;
  onSelect?: (item: PriceGroup) => void;
}) {
  const { lang } = useI18n();
  const oldLabel = lang === "ar" ? "سعر المتر 2016" : "2016 price / m²";
  const newLabel = lang === "ar" ? "سعر المتر 2026" : "2026 price / m²";
  const view = data.slice(0, 10);
  const minWidth = Math.max(680, view.length * 94);
  return (
    <div className="overflow-x-auto pb-1">
      <div style={{ minWidth }}>
        <ResponsiveContainer width="100%" height={height} minWidth={0}>
          <BarChart data={view} margin={{ top: 34, right: 14, left: 6, bottom: 70 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGrid} />
            <XAxis
              type="category"
              dataKey="name"
              interval={0}
              height={72}
              angle={-18}
              textAnchor="end"
              tick={{ fill: chartText, fontSize: 11, fontWeight: 800 }}
              tickFormatter={(value) => short(String(value), 20)}
            />
            <YAxis type="number" tick={{ fill: chartMutedText, fontSize: 10, fontWeight: 700 }} tickFormatter={(value) => formatNum(Number(value), lang, 0)} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: unknown, name: unknown) => [
                `${formatNum(Number(value), lang, 0)} ${lang === "ar" ? "جنيه/م²" : "EGP/m²"}`,
                String(name ?? ""),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: chartText, fontWeight: 800 }} verticalAlign="top" />
            <Bar dataKey="rate2016" name={oldLabel} fill="#7fc8ec" radius={[4, 4, 0, 0]} maxBarSize={48} cursor={onSelect ? "pointer" : undefined} onClick={(entry: any) => onSelect?.(entry?.payload ?? entry)}>
              {view.map((item) => <Cell key={`old-${item.rawName ?? item.name}`} fill="#7fc8ec" fillOpacity={!selectedKey || (item.rawName ?? item.name) === selectedKey ? 1 : 0.28} />)}
              <LabelList dataKey="rate2016" position="top" formatter={(value: unknown) => formatNum(Number(value), lang, 0)} fill={chartText} fontSize={10} fontWeight={800} />
            </Bar>
            <Bar dataKey="rate2026" name={newLabel} fill="#0b5ea8" radius={[4, 4, 0, 0]} maxBarSize={48} cursor={onSelect ? "pointer" : undefined} onClick={(entry: any) => onSelect?.(entry?.payload ?? entry)}>
              {view.map((item) => <Cell key={`new-${item.rawName ?? item.name}`} fill="#0b5ea8" fillOpacity={!selectedKey || (item.rawName ?? item.name) === selectedKey ? 1 : 0.28} />)}
              <LabelList dataKey="rate2026" position="top" formatter={(value: unknown) => formatNum(Number(value), lang, 0)} fill={chartText} fontSize={10} fontWeight={800} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PriceGrowthChart({ data, height = 300 }: { data: PriceGroup[]; height?: number }) {
  const { lang } = useI18n();
  const view = data
    .filter((item) => item.count > 0)
    .sort((a, b) => b.growth - a.growth);
  const growthLabel = (value: unknown) => `+${formatNum(Number(value), lang, 1)}%`;
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={view} margin={{ top: 34, right: 18, left: 18, bottom: 46 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGrid} />
        <XAxis
          type="category"
          dataKey="name"
          interval={0}
          height={58}
          tick={{ fill: chartText, fontSize: 12, fontWeight: 900 }}
          tickFormatter={(value) => short(String(value), 18)}
        />
        <YAxis
          type="number"
          domain={[0, "dataMax + 150"]}
          width={72}
          tick={{ fill: chartMutedText, fontSize: 11, fontWeight: 800 }}
          tickFormatter={(value) => `${formatNum(Number(value), lang, 0)}%`}
        />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={tooltipStyle}
          formatter={(value: unknown, _name: unknown, item: any) => [
            `${growthLabel(value)} · ${formatNum(item?.payload?.rate2016 ?? 0, lang, 0)} ← ${formatNum(item?.payload?.rate2026 ?? 0, lang, 0)}`,
            lang === "ar" ? "الزيادة · سعر 2016 ← سعر 2026" : "Growth · 2016 price → 2026 price",
          ]}
        />
        <Bar
          dataKey="growth"
          name={lang === "ar" ? "نسبة الزيادة" : "Growth rate"}
          radius={[7, 7, 0, 0]}
          maxBarSize={110}
          activeBar={false}
        >
          {view.map((item) => (
            <Cell key={item.name} fill={item.color ?? (item.growth >= 0 ? "#22c55e" : "#ef4444")} />
          ))}
          <LabelList dataKey="growth" position="top" formatter={growthLabel} fill={chartText} fontSize={13} fontWeight={900} />
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
  const parcelLabel = lang === "ar" ? "قطعة" : "parcels";
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={data} margin={{ top: 28, right: 12, left: 4, bottom: 48 }} barCategoryGap="20%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGrid} />
        <XAxis
          type="category"
          dataKey="name"
          interval={0}
          height={62}
          tick={{ fill: chartText, fontSize: 9, fontWeight: 800 }}
        />
        <YAxis
          type="number"
          tick={{ fill: chartMutedText, fontSize: 9 }}
          tickFormatter={(value) => formatNum(Number(value), lang, 0)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: unknown, name: unknown) => [
            `${formatNum(Number(value), lang, 0)} ${parcelLabel}`,
            String(name ?? ""),
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: chartText }} verticalAlign="top" />
        <Bar dataKey="count2016" name="2016" fill="#7fc8ec" radius={[4, 4, 0, 0]} maxBarSize={52}>
          <LabelList dataKey="count2016" position="top" formatter={(value: unknown) => formatNum(Number(value), lang, 0)} fill={chartText} fontSize={9} fontWeight={800} />
        </Bar>
        <Bar dataKey="count2026" name="2026" fill="#0b5ea8" radius={[4, 4, 0, 0]} maxBarSize={52}>
          <LabelList dataKey="count2026" position="top" formatter={(value: unknown) => formatNum(Number(value), lang, 0)} fill={chartText} fontSize={9} fontWeight={800} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
