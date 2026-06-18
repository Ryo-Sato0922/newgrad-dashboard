"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { yen } from "@/lib/kpis";

const grid = "#ece3cf";
const ink = "#746b5d";
const yellow = "#f8c900";
const black = "#1f1a13";
const green = "#168a5f";
const amber = "#c78100";
const tooltipStyle = {
  border: "1px solid #ece3cf",
  borderRadius: 8,
  boxShadow: "0 10px 28px rgba(31, 26, 19, 0.08)"
};

export function HiringTrendChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="offers" name="内定" fill={green} radius={[4, 4, 0, 0]} />
        <Bar dataKey="joins" name="入社" fill={amber} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueTrendChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 10000}万`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => yen(Number(value))} />
        <Legend />
        <Line type="monotone" dataKey="mrr" name="MRR" stroke={black} strokeWidth={2.5} dot={{ r: 3, fill: yellow }} />
        <Line type="monotone" dataKey="arrForecast" name="ARR見込み" stroke={green} strokeWidth={2.5} dot={{ r: 3, fill: green }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data, xKey, bars }: { data: Array<Record<string, string | number>>; xKey: string; bars: { key: string; name: string; color?: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        {bars.map((bar) => (
          <Bar key={bar.key} dataKey={bar.key} name={bar.name} fill={bar.color ?? yellow} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({ data }: { data: { name: string; value: number; transitionRate: number }[] }) {
  const max = Math.max(...data.map((item) => item.value));
  const colors = ["#1f1a13", "#4b4032", "#7a6a52", "#b08a00", "#f8c900", "#ffd84d", "#168a5f", "#c78100"];

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={item.name} className="grid grid-cols-[88px_1fr_72px] items-center gap-3 text-sm sm:grid-cols-[120px_1fr_96px]">
          <div className="font-medium text-ink">{item.name}</div>
          <div className="h-9 rounded bg-stone-100">
            <div
              className="flex h-full items-center justify-end rounded px-3 text-xs font-semibold text-white"
              style={{ width: `${Math.max(7, (item.value / max) * 100)}%`, backgroundColor: colors[index] }}
            >
              {item.value.toLocaleString("ja-JP")}
            </div>
          </div>
          <div className="text-right text-xs text-muted">{item.transitionRate.toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
}

export function ScatterCorrelation({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: -10 }}>
        <CartesianGrid stroke={grid} />
        <XAxis type="number" dataKey="repeatShiftCount" name="リピート勤務回数" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="number" dataKey="desireLift" name="志望度上昇" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter name="ワーカー" data={data} fill={yellow}>
          {data.map((_, index) => (
            <Cell key={index} fill={index % 3 === 0 ? green : index % 3 === 1 ? yellow : amber} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

export function GrossProfitChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 10000}万`} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => yen(Number(value))} />
        <Area type="monotone" dataKey="grossProfit" name="粗利" fill="#fff3bf" stroke={yellow} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BusinessPlanMonthlyChart({
  data,
  onMonthClick
}: {
  data: Array<Record<string, string | number>>;
  onMonthClick?: (month: string) => void;
}) {
  function handleMonthClick(entry: { payload?: Record<string, string | number> }) {
    const month = entry.payload?.month;
    if (typeof month === "string") onMonthClick?.(month);
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -14 }} barGap={8} barCategoryGap="26%">
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Bar dataKey="actualCompanies" name="実績" fill={green} radius={[4, 4, 0, 0]} maxBarSize={34} onClick={handleMonthClick} cursor="pointer" />
        <Bar dataKey="pipelineStar3" name="ヨミ ★★★" stackId="pipeline" fill="#0f7a55" radius={[0, 0, 0, 0]} maxBarSize={34} onClick={handleMonthClick} cursor="pointer" />
        <Bar dataKey="pipelineStar2" name="ヨミ ★★" stackId="pipeline" fill={yellow} radius={[0, 0, 0, 0]} maxBarSize={34} onClick={handleMonthClick} cursor="pointer" />
        <Bar dataKey="pipelineStar1" name="ヨミ ★" stackId="pipeline" fill={amber} radius={[4, 4, 0, 0]} maxBarSize={34} onClick={handleMonthClick} cursor="pointer" />
        <Line type="monotone" dataKey="targetCompanies" name="計画" stroke={black} strokeWidth={2.5} dot={{ r: 3, fill: black }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function BusinessPlanCumulativeChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 0, left: -14 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: ink, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
        <Line type="monotone" dataKey="cumulativeTarget" name="累計計画" stroke={black} strokeWidth={2.5} dot={{ r: 3, fill: black }} />
        <Line type="monotone" dataKey="cumulativeActual" name="累計実績" stroke={green} strokeWidth={2.5} dot={{ r: 3, fill: green }} />
        <Line type="monotone" dataKey="cumulativeStandard" name="累計標準着地" stroke={amber} strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: amber }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
