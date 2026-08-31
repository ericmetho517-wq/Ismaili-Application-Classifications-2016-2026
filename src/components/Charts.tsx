import { useI18n, formatNum } from "@/lib/i18n";
import { labelFor, colorFor } from "@/lib/colors";
import { translateValue } from "@/lib/labels";
import type { SummaryItem } from "@/lib/data";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend as RLegend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts";


const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--brand)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 13,
  fontWeight: 700,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
  backdropFilter: "blur(12px)",
  padding: "8px 12px",
};

const chartTextColor = "var(--foreground)";
const chartMutedTextColor = "var(--muted-foreground)";
const chartGridColor = "color-mix(in oklch, var(--foreground) 22%, transparent)";
const chartSurfaceStroke = "color-mix(in oklch, var(--foreground) 18%, transparent)";
const chartRestColor = "color-mix(in oklch, var(--foreground) 16%, transparent)";
const chartSelectedStroke = "var(--foreground)";

type ChartSelect<T = SummaryItem> = {
  selectedName?: string | null;
  onSelect?: (item: T) => void;
};

function shortLabel(value: unknown, max = 18) {
  const label = String(value ?? "");
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function CategoryTick(props: any) {
  const label = shortLabel(props.payload?.value, props.maxChars ?? 15);
  return (
    <text
      x={Number(props.x) - (props.offset ?? 56)}
      y={Number(props.y)}
      fill={chartTextColor}
      fontSize={props.fontSize ?? 10}
      fontWeight={600}
      textAnchor="end"
      dominantBaseline="middle"
      direction={props.isRtl ? "rtl" : "ltr"}
      style={{ unicodeBidi: "plaintext", pointerEvents: "none" }}
    >
      {label}
    </text>
  );
}

export function PieUsageChart({
  data,
  height = 280,
  translate = true,
}: {
  data: SummaryItem[];
  height?: number | `${number}%`;
  translate?: boolean;
}) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const view = data.slice(0, 8).map((d) => ({
    ...d,
    label: translate ? labelFor(d.name, lang) : d.name,
    fill: colorFor(d.name),
  }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={view}
          dataKey="area_km2"
          nameKey="label"
          cx="50%"
          cy="50%"
          innerRadius="38%"
          outerRadius="68%"
          paddingAngle={2}
          stroke={chartSurfaceStroke}
        >
          {view.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any) => `${formatNum(Number(v), lang)} km²`}
        />
        <RLegend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          wrapperStyle={{ fontSize: 10, color: "var(--foreground)", lineHeight: "14px", maxWidth: "45%" }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HBarUsageChart({
  data,
  height = 280,
  translate = true,
  selectedName,
  onSelect,
}: {
  data: SummaryItem[];
  height?: number | `${number}%`;
  translate?: boolean;
} & ChartSelect) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const view = data
    .slice(0, 8)
    .map((d) => ({
      ...d,
      label: translate ? labelFor(d.name, lang) : d.name,
      fill: colorFor(d.name),
    }))
    .sort((a, b) => b.area_km2 - a.area_km2);
  const total = view.reduce((s, d) => s + d.area_km2, 0) || 1;
  const labelWidth = isRtl ? 170 : 150;
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart
        data={view}
        layout="vertical"
        margin={{ top: 8, right: 86, left: 6, bottom: 8 }}
        barCategoryGap="26%"
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis type="number" tick={{ fill: chartTextColor, fontSize: 9 }} />
        <YAxis
          type="category"
          dataKey="label"
          tick={(props: any) => <CategoryTick {...props} isRtl={isRtl} offset={58} maxChars={16} />}
          tickLine={false}
          axisLine={false}
          width={labelWidth}
          interval={0}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => {
            const km = Number(v);
            const pct = formatNum((km / total) * 100, lang, 1);
            return [`${formatNum(km, lang)} km² (${pct}%)`, p?.payload?.label];
          }}
        />
        <Bar dataKey="area_km2" radius={[0, 4, 4, 0]}>
          {view.map((d, i) => (
            <Cell
              key={i}
              fill={d.fill}
              opacity={!selectedName || selectedName === d.name ? 1 : 0.35}
              stroke={selectedName === d.name ? chartSelectedStroke : "transparent"}
              strokeWidth={selectedName === d.name ? 2 : 0}
              cursor={onSelect ? "pointer" : "default"}
              onClick={() => onSelect?.(d)}
            />
          ))}
          <LabelList
            dataKey="area_km2"
            content={(props: any) => {
              const { x, y, width, height, value } = props;
              const km = Number(value);
              const pct = formatNum((km / total) * 100, lang, 1);
              const text = `${formatNum(km, lang)} km² · ${pct}%`;
              return (
                <text
                  x={Number(x) + Number(width) + 8}
                  y={Number(y) + Number(height) / 2}
                  fill={chartTextColor}
                  fontSize={9}
                  fontWeight={700}
                  textAnchor="start"
                  dominantBaseline="middle"
                  direction="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {text}
                </text>
              );
            }}
          />

        </Bar>
      </BarChart>

    </ResponsiveContainer>
  );
}




export function BarUsageChart({
  data,
  height = 280,
  translate = true,
  selectedName,
  onSelect,
}: {
  data: SummaryItem[];
  height?: number | `${number}%`;
  translate?: boolean;
} & ChartSelect) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const total = data.reduce((s, d) => s + d.area_km2, 0) || 1;
  const view = data.slice(0, 10).map((d) => ({
    ...d,
    label: translate ? labelFor(d.name, lang) : d.name,
    fill: colorFor(d.name),
    pct: +((d.area_km2 / total) * 100).toFixed(2),
  }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={view} margin={{ top: 20, right: 10, left: 0, bottom: 40 }} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis
          dataKey="label"
          tick={{ fill: chartTextColor, fontSize: 10 }}
          interval={0}
          angle={-25}
          textAnchor="end"
        />
        <YAxis
          tick={{ fill: chartTextColor, fontSize: 10 }}
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${formatNum(Number(v), lang, 0)}%`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => [
            `${v}% (${formatNum(p?.payload?.area_km2 ?? 0, lang)} km²)`,
            p?.payload?.label,
          ]}
        />
        <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={60}>
          {view.map((d, i) => (
            <Cell
              key={i}
              fill={d.fill}
              opacity={!selectedName || selectedName === d.name ? 1 : 0.35}
              stroke={selectedName === d.name ? chartSelectedStroke : "transparent"}
              strokeWidth={selectedName === d.name ? 2 : 0}
              cursor={onSelect ? "pointer" : "default"}
              onClick={() => onSelect?.(d)}
            />
          ))}
          <LabelList
            dataKey="pct"
            position="top"
            fill={chartTextColor}
            fontSize={11}
            formatter={(v: any) => `${v}%`}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompareYearsChart({
  a,
  b,
  labelA,
  labelB,
  height = 320,
  selectedName,
  onSelect,
}: {
  a: SummaryItem[];
  b: SummaryItem[];
  labelA: string;
  labelB: string;
  height?: number | `${number}%`;
} & ChartSelect<any>) {
  const { lang } = useI18n();
  const keys = Array.from(new Set([...a, ...b].map((d) => d.name))).slice(0, 9);
  const merged = keys.map((k) => ({
    name: k,
    label: labelFor(k, lang),
    color: colorFor(k),
    A: a.find((d) => d.name === k)?.area_km2 || 0,
    B: b.find((d) => d.name === k)?.area_km2 || 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={merged} margin={{ top: 16, right: 12, left: 0, bottom: 44 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis
          dataKey="label"
          tick={{ fill: chartTextColor, fontSize: 9 }}
          interval={0}
          tickFormatter={(v) => shortLabel(v, 10)}
          angle={-20}
          textAnchor="end"
        />
        <YAxis tick={{ fill: chartTextColor, fontSize: 9 }} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any) => `${formatNum(Number(v), lang)} km²`}
        />
        <RLegend wrapperStyle={{ fontSize: 11, color: "var(--foreground)", paddingTop: 8 }} verticalAlign="bottom" />
        <Bar dataKey="A" name={labelA} fill="#7fc8ec" radius={[4, 4, 0, 0]}>
          {merged.map((d, i) => (
            <Cell key={i} opacity={!selectedName || selectedName === d.name ? 1 : 0.35} cursor={onSelect ? "pointer" : "default"} onClick={() => onSelect?.(d)} />
          ))}
        </Bar>
        <Bar dataKey="B" name={labelB} fill="#0b5ea8" radius={[4, 4, 0, 0]}>
          {merged.map((d, i) => (
            <Cell key={i} opacity={!selectedName || selectedName === d.name ? 1 : 0.35} cursor={onSelect ? "pointer" : "default"} onClick={() => onSelect?.(d)} />
          ))}
        </Bar>

      </BarChart>
    </ResponsiveContainer>
  );
}

/** Diverging bar chart showing net area change (km²) per category 2016 → 2026. */
export function DeltaBarChart({
  a,
  b,
  height = 320,
  selectedName,
  onSelect,
}: {
  a: SummaryItem[];
  b: SummaryItem[];
  height?: number | `${number}%`;
} & ChartSelect<any>) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const keys = Array.from(new Set([...a, ...b].map((d) => d.name)));
  const merged = keys
    .map((k) => {
      const va = a.find((d) => d.name === k)?.area_km2 || 0;
      const vb = b.find((d) => d.name === k)?.area_km2 || 0;
      return {
        name: k,
        label: labelFor(k, lang),
        delta: +(vb - va).toFixed(2),
        pct: va > 0 ? +(((vb - va) / va) * 100).toFixed(1) : vb > 0 ? 100 : 0,
      };
    })
    .sort((x, y) => y.delta - x.delta)
    .slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={merged} layout="vertical" margin={{ top: 8, right: 60, left: 8, bottom: 8 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis type="number" tick={{ fill: chartTextColor, fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="label"
          tick={(props: any) => <CategoryTick {...props} isRtl={isRtl} offset={54} maxChars={13} fontSize={9} />}
          tickLine={false}
          axisLine={false}
          width={132}
          interval={0}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => [
            `${formatNum(Number(v), lang)} km² (${p?.payload?.pct >= 0 ? "+" : ""}${p?.payload?.pct}%)`,
            p?.payload?.label,
          ]}
        />
        <Bar dataKey="delta" radius={[0, 4, 4, 0]}>
          {merged.map((d, i) => (
            <Cell
              key={i}
              fill={d.delta >= 0 ? "#22c55e" : "#ef4444"}
              opacity={!selectedName || selectedName === d.name ? 1 : 0.35}
              stroke={selectedName === d.name ? chartSelectedStroke : "transparent"}
              strokeWidth={selectedName === d.name ? 2 : 0}
              cursor={onSelect ? "pointer" : "default"}
              onClick={() => onSelect?.(d)}
            />
          ))}
          <LabelList
            dataKey="delta"
            content={(props: any) => {
              const { x, y, width, height, value, index } = props;
              const v = Number(value);
              const pct = merged[index]?.pct ?? 0;
              const text = `${v >= 0 ? "+" : ""}${formatNum(v, lang)} (${pct >= 0 ? "+" : ""}${pct}%)`;
              return (
                <text
                  x={Number(x) + (v >= 0 ? Number(width) + 6 : -6)}
                  y={Number(y) + Number(height) / 2}
                  fill={chartTextColor}
                  fontSize={10}
                  textAnchor={v >= 0 ? "start" : "end"}
                  dominantBaseline="middle"
                  direction="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {text}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Compact comparison table: name | 2016 | 2026 | Δ | % */
export function ChangeTable({
  a,
  b,
  labelA = "2016",
  labelB = "2026",
  limit = 10,
}: {
  a: SummaryItem[];
  b: SummaryItem[];
  labelA?: string;
  labelB?: string;
  limit?: number;
}) {
  const { lang } = useI18n();
  const keys = Array.from(new Set([...a, ...b].map((d) => d.name)));
  const rows = keys
    .map((k) => {
      const va = a.find((d) => d.name === k)?.area_km2 || 0;
      const vb = b.find((d) => d.name === k)?.area_km2 || 0;
      const delta = vb - va;
      const pct = va > 0 ? (delta / va) * 100 : vb > 0 ? 100 : 0;
      return { name: k, label: labelFor(k, lang), color: colorFor(k), va, vb, delta, pct };
    })
    .sort((x, y) => y.vb - x.vb)
    .slice(0, limit);
  return (
    <div className="max-h-[360px] overflow-auto">
      <table className="w-full min-w-[680px] table-fixed border-separate border-spacing-0 text-[11px]" dir="ltr">
        <thead className="text-muted-foreground">
          <tr className="border-b border-foreground/10">
            <th className="w-[34%] py-1.5 ps-1 text-start font-medium">الفئة</th>
            <th className="w-[16%] py-1.5 text-end font-medium">{labelA}</th>
            <th className="w-[16%] py-1.5 text-end font-medium">{labelB}</th>
            <th className="w-[18%] py-1.5 text-end font-medium">Δ km²</th>
            <th className="w-[16%] py-1.5 pe-1 text-end font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const up = r.delta > 0;
            const tone = r.delta === 0 ? "text-muted-foreground" : up ? "text-emerald-400" : "text-rose-400";
            return (
              <tr key={r.name} className="border-b border-foreground/5">
                <td className="py-1.5 ps-1" dir="rtl">
                  <span className="flex min-w-0 items-center justify-end gap-1.5 text-foreground">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                    <span className="block max-w-[210px] truncate text-right">{r.label}</span>
                  </span>
                </td>
                <td className="py-1.5 text-end text-foreground/80" dir="ltr">{formatNum(r.va, lang)}</td>
                <td className="py-1.5 text-end font-semibold text-foreground" dir="ltr">{formatNum(r.vb, lang)}</td>
                <td className={`py-1.5 text-end font-semibold ${tone}`} dir="ltr">
                  {(r.delta >= 0 ? "+" : "") + formatNum(r.delta, lang)}
                </td>
                <td className={`py-1.5 pe-1 text-end font-bold ${tone}`} dir="ltr">
                  {(r.pct >= 0 ? "+" : "") + formatNum(r.pct, lang, 1)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Percentage horizontal bar chart with custom colors per bucket. Used for
 *  histograms (size distribution, etc.) where each bar is share of total count. */
export function PercentBarChart({
  data,
  unit = "",
  height = 280,
  metric = "count",
  palette,
  selectedName,
  onSelect,
}: {
  data: SummaryItem[];
  unit?: string;
  height?: number | `${number}%`;
  /** Which numeric field drives the percentage. */
  metric?: "count" | "area_km2";
  palette?: string[];
} & ChartSelect) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const total = data.reduce((s, d) => s + (d as any)[metric], 0) || 1;
  const colors = palette ?? [
    "#22d3ee",
    "#3b82f6",
    "#8b5cf6",
    "#a855f7",
    "#ec4899",
    "#f59e0b",
    "#22c55e",
    "#10b981",
  ];
  const view = data.map((d, i) => ({
    ...d,
    label: shortLabel(d.name, 14),
    fullLabel: d.name,
    pct: +(((d as any)[metric] / total) * 100).toFixed(2),
    fill: colors[i % colors.length],
  }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={view} layout="vertical" margin={{ top: 6, right: 18, left: 4, bottom: 8 }} barCategoryGap="24%">
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis
          type="number"
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(v) => `${formatNum(Number(v), lang, 0)}%`}
          tick={{ fill: chartTextColor, fontSize: 9 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={(props: any) => <CategoryTick {...props} isRtl={isRtl} offset={50} maxChars={12} fontSize={9} />}
          tickLine={false}
          axisLine={false}
          width={112}
          interval={0}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => [
            `${v}% (${formatNum((p?.payload as any)[metric] ?? 0, lang)} ${unit})`,
            p?.payload?.fullLabel,
          ]}
        />
        <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {view.map((d, i) => (
            <Cell
              key={i}
              fill={d.fill}
              opacity={!selectedName || selectedName === d.name ? 1 : 0.35}
              stroke={selectedName === d.name ? chartSelectedStroke : "transparent"}
              strokeWidth={selectedName === d.name ? 2 : 0}
              cursor={onSelect ? "pointer" : "default"}
              onClick={() => onSelect?.(d)}
            />
          ))}
          <LabelList
            dataKey="pct"
            content={(props: any) => {
              const { x, y, width, height, value } = props;
              if (Number(width) < 18) return null;
              return (
                <text
                  x={Number(x) + Number(width) - 6}
                  y={Number(y) + Number(height) / 2}
                  fill={chartTextColor}
                  fontSize={9}
                  fontWeight={700}
                  textAnchor="end"
                  dominantBaseline="middle"
                  direction="ltr"
                >
                  {formatNum(Number(value), lang, Number(value) >= 10 ? 0 : 1)}%
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Horizontal top-N bar chart with configurable label space and km² + % labels. */
export function TopNBarChart({
  data,
  unit = "km²",
  height = 320,
  color = "#a855f7",
  translate = false,
  labelMaxChars = 17,
  yAxisWidth = 138,
  tickOffset = 58,
  selectedName,
  onSelect,
}: {
  data: SummaryItem[];
  unit?: string;
  height?: number | `${number}%`;
  color?: string;
  translate?: boolean;
  labelMaxChars?: number;
  yAxisWidth?: number;
  tickOffset?: number;
} & ChartSelect) {
  const { lang } = useI18n();
  const isRtl = lang === "ar";
  const total = data.reduce((s, d) => s + d.area_km2, 0) || 1;
  const view = data.slice(0, 10).map((d) => {
    const fullLabel = translate ? translateValue(d.name, lang) : d.name;
    return {
      ...d,
      fullLabel,
      label: shortLabel(fullLabel, labelMaxChars),
      pct: +((d.area_km2 / total) * 100).toFixed(1),
    };
  });
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <BarChart data={view} layout="vertical" margin={{ top: 6, right: 18, left: 4, bottom: 8 }} barCategoryGap="24%">
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis type="number" tick={{ fill: chartTextColor, fontSize: 9 }} />
        <YAxis
          type="category"
          dataKey="label"
          tick={(props: any) => <CategoryTick {...props} isRtl={isRtl} offset={tickOffset} maxChars={labelMaxChars} fontSize={9} />}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth}
          interval={0}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => [
            `${formatNum(Number(v), lang)} ${unit} (${p?.payload?.pct}%)`,
            p?.payload?.fullLabel,
          ]}
        />
        <Bar dataKey="area_km2" fill={color} radius={[0, 4, 4, 0]}>
          {view.map((d, i) => (
            <Cell
              key={i}
              opacity={!selectedName || selectedName === d.name ? 1 : 0.35}
              stroke={selectedName === d.name ? chartSelectedStroke : "transparent"}
              strokeWidth={selectedName === d.name ? 2 : 0}
              cursor={onSelect ? "pointer" : "default"}
              onClick={() => onSelect?.(d)}
            />
          ))}
          <LabelList
            dataKey="area_km2"
            content={(props: any) => {
              const { x, y, width, height, value, index } = props;
              const v = Number(value);
              const pct = view[index]?.pct ?? 0;
              const text = Number(width) > 72 ? `${formatNum(v, lang, v > 100 ? 0 : 2)} · ${pct}%` : `${pct}%`;
              if (Number(width) < 24) return null;
              return (
                <text
                  x={Number(x) + Number(width) - 6}
                  y={Number(y) + Number(height) / 2}
                  fill={chartTextColor}
                  fontSize={9}
                  fontWeight={700}
                  textAnchor="end"
                  dominantBaseline="middle"
                  direction="ltr"
                  style={{ unicodeBidi: "isolate" }}
                >
                  {text}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Stacked 100% bar comparing share of each category in 2016 vs 2026. */
export function ShareCompareChart({
  a,
  b,
  labelA = "2016",
  labelB = "2026",
  height = 280,
  limit = 6,
  selectedName,
  onSelect,
}: {
  a: SummaryItem[];
  b: SummaryItem[];
  labelA?: string;
  labelB?: string;
  height?: number | `${number}%`;
  limit?: number;
} & ChartSelect) {
  const { lang } = useI18n();
  const totA = a.reduce((s, d) => s + d.area_km2, 0) || 1;
  const totB = b.reduce((s, d) => s + d.area_km2, 0) || 1;
  const keys = Array.from(
    new Set(
      [...a, ...b]
        .sort((x, y) => y.area_km2 - x.area_km2)
        .slice(0, limit * 2)
        .map((d) => d.name),
    ),
  ).slice(0, limit);
  const otherKey = "__other__";
  const otherLabel = lang === "ar" ? "أخرى" : "Other";
  const buildSegments = (src: SummaryItem[], tot: number) => {
    const segments = keys.map((k) => {
      const area = src.find((d) => d.name === k)?.area_km2 || 0;
      return {
        key: k,
        label: labelFor(k, lang),
        area,
        pct: +((area / tot) * 100).toFixed(2),
        color: colorFor(k),
      };
    });
    const usedArea = segments.reduce((sum, segment) => sum + segment.area, 0);
    const otherArea = Math.max(0, tot - usedArea);
    if (otherArea > 0.01) {
      segments.push({
        key: otherKey,
        label: otherLabel,
        area: otherArea,
        pct: +((otherArea / tot) * 100).toFixed(2),
        color: chartRestColor,
      });
    }
    return segments.filter((segment) => segment.pct > 0);
  };
  const rows = [
    { label: labelA, segments: buildSegments(a, totA) },
    { label: labelB, segments: buildSegments(b, totB) },
  ];
  const legend = rows[0].segments.filter(
    (segment) => segment.key !== otherKey || rows.some((rowItem) => rowItem.segments.some((s) => s.key === otherKey)),
  );
  return (
    <div className="flex min-h-0 flex-col justify-between gap-3 overflow-hidden p-2" style={{ height }}>
      <div className="flex flex-1 flex-col justify-center gap-4">
        {rows.map((rowItem) => (
          <div key={rowItem.label} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2">
            <div className="text-left text-[12px] font-bold text-foreground" dir="ltr">
              {rowItem.label}
            </div>
            <div className="flex h-11 overflow-hidden rounded-xl border border-foreground/10 bg-foreground/10 shadow-inner">
              {rowItem.segments.map((segment) => {
                const isSelected = !selectedName || selectedName === segment.key || segment.key === otherKey;
                const canSelect = onSelect && segment.key !== otherKey;
                return (
                  <button
                    key={segment.key}
                    type="button"
                    title={`${segment.label}: ${formatNum(segment.pct, lang, 1)}% - ${formatNum(segment.area, lang)} km2`}
                    onClick={() =>
                      canSelect ? onSelect({ name: segment.key, area_km2: segment.area, count: 0 }) : undefined
                    }
                    className="relative flex min-w-0 items-center justify-center overflow-hidden border-e border-background/35 text-[10px] font-bold text-white transition-opacity"
                    style={{
                      width: `${segment.pct}%`,
                      minWidth: segment.pct >= 2 ? 10 : 4,
                      background: segment.color,
                      opacity: isSelected ? 1 : 0.35,
                      cursor: canSelect ? "pointer" : "default",
                    }}
                  >
                    {segment.pct >= 8 && (
                      <span className="truncate px-1 drop-shadow" dir="ltr">
                        {formatNum(segment.pct, lang, segment.pct >= 10 ? 0 : 1)}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1.5 border-t border-foreground/10 pt-2">
        {legend.map((segment) => (
          <button
            key={segment.key}
            type="button"
            onClick={() =>
              onSelect && segment.key !== otherKey
                ? onSelect({ name: segment.key, area_km2: segment.area, count: 0 })
                : undefined
            }
            className="flex max-w-[130px] items-center gap-1.5 text-[10px] font-bold text-muted-foreground transition-colors hover:text-foreground"
            dir="rtl"
            title={segment.label}
          >
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: segment.color }} />
            <span className="truncate">{segment.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Movers leaderboard: top gainers + top losers by % change. */
export function MoversBoard({
  a,
  b,
  topN = 4,
}: {
  a: SummaryItem[];
  b: SummaryItem[];
  topN?: number;
}) {
  const { lang } = useI18n();
  const keys = Array.from(new Set([...a, ...b].map((d) => d.name)));
  const rows = keys
    .map((k) => {
      const va = a.find((d) => d.name === k)?.area_km2 || 0;
      const vb = b.find((d) => d.name === k)?.area_km2 || 0;
      const pct = va > 0 ? ((vb - va) / va) * 100 : vb > 0 ? 100 : 0;
      return { k, label: labelFor(k, lang), color: colorFor(k), va, vb, pct };
    })
    .filter((r) => r.va + r.vb > 0.5);
  const gainers = [...rows].sort((x, y) => y.pct - x.pct).slice(0, topN);
  const losers = [...rows].sort((x, y) => x.pct - y.pct).slice(0, topN);
  const Row = ({ r, tone }: { r: (typeof rows)[number]; tone: string }) => (
    <li className="grid grid-cols-[minmax(0,1fr)_58px] items-center gap-2 border-b border-foreground/5 py-1.5 text-[11px]">
      <span className="flex min-w-0 items-center gap-1.5 text-foreground">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
        <span className="truncate">{r.label}</span>
      </span>
      <span className={`text-end font-bold ${tone}`} dir="ltr">
        {(r.pct >= 0 ? "+" : "") + formatNum(r.pct, lang, 0)}%
      </span>
    </li>
  );
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">▲ Top gainers</p>
        <ul>
          {gainers.map((r) => (
            <Row key={"g" + r.k} r={r} tone="text-emerald-400" />
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-rose-400">▼ Top losers</p>
        <ul>
          {losers.map((r) => (
            <Row key={"l" + r.k} r={r} tone="text-rose-400" />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Treemap — hierarchical area visualization with % labels. */
export function TreemapAreaChart({
  data,
  height = 320,
  translate = true,
  selectedName,
  onSelect,
}: {
  data: SummaryItem[];
  height?: number | `${number}%`;
  translate?: boolean;
} & ChartSelect) {
  const { lang } = useI18n();
  const total = data.reduce((s, d) => s + d.area_km2, 0) || 1;
  const view = data
    .filter((d) => d.area_km2 > 0)
    .map((d) => ({
      rawName: d.name,
      name: translate ? labelFor(d.name, lang) : d.name,
      size: d.area_km2,
      pct: +((d.area_km2 / total) * 100).toFixed(1),
      fill: colorFor(d.name),
      count: d.count,
    }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <Treemap
        data={view}
        dataKey="size"
        stroke={chartSurfaceStroke}
        content={(props: any) => {
          const { x, y, width, height: h, name, rawName, pct, fill, depth, count, size } = props;
          if (depth === 0 || width <= 0 || h <= 0) return <g />;
          const showFullLabel = width >= 150 && h >= 76;
          const showPercentOnly = !showFullLabel && width >= 82 && h >= 44;
          const label = shortLabel(name, Math.max(8, Math.floor(width / 11)));
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={h}
                fill={fill}
                stroke={chartSurfaceStroke}
                strokeWidth={selectedName === rawName ? 4 : 2}
                opacity={!selectedName || selectedName === rawName ? 1 : 0.35}
                cursor={onSelect ? "pointer" : "default"}
                onClick={() => onSelect?.({ name: rawName, area_km2: Number(size), count: Number(count ?? 0) })}
              />
              {showFullLabel && (
                <foreignObject x={x + 8} y={y + 8} width={Math.max(0, width - 16)} height={44}>
                  <div
                    dir="rtl"
                    className="inline-flex max-w-full flex-col rounded-md bg-background/65 px-2 py-1 text-right leading-tight shadow-sm backdrop-blur-sm"
                  >
                    <span className="truncate text-[11px] font-bold text-foreground">{label}</span>
                    <span className="mt-0.5 text-[10px] font-bold text-foreground/90" dir="ltr">
                      {pct}%
                    </span>
                  </div>
                </foreignObject>
              )}
              {showPercentOnly && (
                <foreignObject x={x + 6} y={y + 6} width={Math.max(0, width - 12)} height={24}>
                  <div className="inline-flex rounded bg-background/75 px-1.5 py-0.5 text-[10px] font-bold leading-none text-foreground shadow-sm" dir="ltr">
                    {pct}%
                  </div>
                </foreignObject>
              )}
            </g>
          );
        }}
      >
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, _n, p: any) => [
            `${formatNum(Number(v), lang)} km² (${p?.payload?.pct}%)`,
            p?.payload?.name,
          ]}
        />
      </Treemap>
    </ResponsiveContainer>
  );
}

/** Radial gauge — single % value as an arc with center label. */
export function RadialGauge({
  value,
  label,
  color = "#22d3ee",
  height = 220,
  max = 100,
  suffix = "%",
}: {
  value: number;
  label?: string;
  color?: string;
  height?: number;
  max?: number;
  suffix?: string;
}) {
  const { lang } = useI18n();
  const v = Math.max(0, Math.min(max, value));
  const data = [{ name: label ?? "", value: v, fill: color }];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <RadialBarChart
          data={data}
          innerRadius="65%"
          outerRadius="95%"
          startAngle={210}
          endAngle={-30}
          barSize={18}
        >
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background={{ fill: chartRestColor }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-foreground" dir="ltr">
          {formatNum(v, lang, v < 10 ? 1 : 0)}
          {suffix}
        </span>
        {label && <span className="mt-0.5 text-[11px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}

/** Multi-arc radial bar — compare several categories on a circular scale. */
export function MultiRadialChart({
  data,
  height = 280,
  translate = true,
}: {
  data: SummaryItem[];
  height?: number;
  translate?: boolean;
}) {
  const { lang } = useI18n();
  const total = data.reduce((s, d) => s + d.area_km2, 0) || 1;
  const view = data
    .map((d) => ({
      name: translate ? labelFor(d.name, lang) : d.name,
      rawName: d.name,
      area: d.area_km2,
      pct: +((d.area_km2 / total) * 100).toFixed(1),
      fill: colorFor(d.name),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
  return (
    <div className="flex flex-col gap-2 overflow-auto p-2" style={{ height }}>
      {view.map((item, index) => (
        <div
          key={item.rawName}
          className="rounded-xl border border-foreground/10 bg-background/35 p-2.5 shadow-sm"
        >
          <div className="mb-2 grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2">
            <span
              className="grid h-6 w-6 place-items-center rounded-lg text-[10px] font-bold text-background"
              style={{ background: item.fill }}
            >
              {index + 1}
            </span>
            <span className="min-w-0 truncate text-right text-[12px] font-bold text-foreground" dir="rtl">
              {item.name}
            </span>
            <span
              className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-bold text-foreground"
              dir="ltr"
            >
              {item.pct}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full shadow-[0_0_16px_currentColor]"
              style={{
                width: `${Math.max(3, Math.min(100, item.pct))}%`,
                background: item.fill,
                color: item.fill,
              }}
            />
          </div>
          <div className="mt-1.5 text-left text-[10px] font-semibold text-muted-foreground" dir="ltr">
            {formatNum(item.area, lang)} km²
          </div>
        </div>
      ))}
    </div>
  );
}

/** Radar profile chart — compare a single profile across categories on 0-100% scale. */
export function RadarProfileChart({
  data,
  color = "#22d3ee",
  height = 280,
  translate = true,
}: {
  data: SummaryItem[];
  color?: string;
  height?: number;
  translate?: boolean;
}) {
  const { lang } = useI18n();
  const total = data.reduce((s, d) => s + d.area_km2, 0) || 1;
  const view = data
    .slice(0, 8)
    .map((d) => ({
      subject: translate ? labelFor(d.name, lang) : d.name,
      area: d.area_km2,
      color: colorFor(d.name),
      pct: +((d.area_km2 / total) * 100).toFixed(1),
    }));
  return (
    <div className="flex flex-col gap-2 overflow-auto p-2" style={{ height }}>
      {view.map((item, index) => {
        const fill = item.color || color;
        return (
          <div key={item.subject} className="rounded-lg border border-foreground/10 bg-background/35 p-2">
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
              <div className="min-w-0 truncate text-right font-bold text-foreground" dir="rtl">
                <span className="me-1 inline-flex h-4 w-4 items-center justify-center rounded bg-foreground/10 text-[9px] text-muted-foreground">
                  {index + 1}
                </span>
                {item.subject}
              </div>
              <div className="shrink-0 text-left font-bold text-foreground" dir="ltr">
                {item.pct}% · {formatNum(item.area, lang)} km²
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(2, Math.min(100, item.pct))}%`, background: fill }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Lorenz / cumulative concentration curve — shows what % of items hold what % of area. */
export function LorenzCurveChart({
  values,
  height = 260,
  color = "#22c55e",
  xLabel = "Items %",
  yLabel = "Area %",
}: {
  values: number[];
  height?: number;
  color?: string;
  xLabel?: string;
  yLabel?: string;
}) {
  const { lang } = useI18n();
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => b - a);
  const total = sorted.reduce((s, v) => s + v, 0) || 1;
  let acc = 0;
  const points = sorted.map((v, i) => {
    acc += v;
    return {
      x: +(((i + 1) / sorted.length) * 100).toFixed(2),
      y: +((acc / total) * 100).toFixed(2),
    };
  });
  const sample = points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 80)) === 0);
  if (sample[sample.length - 1]?.x !== 100) sample.push({ x: 100, y: 100 });
  const refLine = sample.map((p) => ({ x: p.x, y: p.x, ref: p.x }));
  const merged = sample.map((p, i) => ({ ...p, ref: refLine[i]?.ref ?? p.x }));
  return (
    <ResponsiveContainer width="100%" height={height} minWidth={0}>
      <AreaChart data={merged} margin={{ top: 10, right: 16, left: 0, bottom: 24 }}>
        <defs>
          <linearGradient id="lorenz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, 100]}
          tickFormatter={(v) => `${formatNum(Number(v), lang, 0)}%`}
          tick={{ fill: chartTextColor, fontSize: 11, fontWeight: 700 }}
          label={{ value: xLabel, fill: chartTextColor, fontSize: 11, fontWeight: 800, position: "insideBottom", offset: -8 }}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(v) => `${formatNum(Number(v), lang, 0)}%`}
          tick={{ fill: chartTextColor, fontSize: 11, fontWeight: 700 }}
          label={{ value: yLabel, fill: chartTextColor, fontSize: 11, fontWeight: 800, angle: -90, position: "insideLeft" }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: any, n: any) => [`${formatNum(Number(v), lang, 1)}%`, n === "y" ? yLabel : xLabel]}
          labelFormatter={(l) => `${xLabel}: ${formatNum(Number(l), lang, 1)}%`}
        />
        <Area type="monotone" dataKey="ref" stroke={chartRestColor} strokeDasharray="4 4" fill="transparent" />
        <Area type="monotone" dataKey="y" stroke={color} strokeWidth={3} fill="url(#lorenz)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut with center KPI — single-metric % donut. */
export function DonutKPI({
  value,
  total,
  label,
  color = "#22d3ee",
  height = 220,
  suffix = "%",
}: {
  value: number;
  total: number;
  label?: string;
  color?: string;
  height?: number;
  suffix?: string;
}) {
  const { lang } = useI18n();
  const pct = total > 0 ? (value / total) * 100 : 0;
  const data = [
    { name: "v", value: pct, fill: color },
    { name: "r", value: Math.max(0, 100 - pct), fill: chartRestColor },
  ];
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius="68%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        <span className="text-2xl font-black leading-none text-foreground" dir="ltr">
          {formatNum(pct, lang, pct < 10 ? 2 : 1)}
          {suffix}
        </span>
        {label && (
          <span className="mt-2 line-clamp-2 max-w-[150px] text-center text-[10px] font-bold leading-4 text-muted-foreground sm:text-[11px]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
