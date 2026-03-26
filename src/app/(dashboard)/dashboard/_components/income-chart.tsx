"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthData {
  month: string;
  ingresos: number;
  egresos: number;
}

interface IncomeChartProps {
  data: MonthData[];
  currency?: string;
}

function formatAmount(value: number, pfx: string) {
  if (value >= 1_000_000) return `${pfx}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${pfx}${(value / 1000).toFixed(0)}k`;
  return `${pfx}${value}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl border border-white/40 px-3.5 py-2.5 text-[13px] shadow-lg"
      style={{
        background: "rgba(255,255,255,0.82)",
        backdropFilter: "blur(16px)",
      }}
    >
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.dataKey}
          </span>
          <span className="ml-auto tabular-nums font-medium">
            {Number(entry.value).toLocaleString("es-AR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function IncomeChart({ data, currency = "USD" }: IncomeChartProps) {
  const prefix = currency === "ARS" ? "ARS " : "$";
  if (data.every((d) => d.ingresos === 0 && d.egresos === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Sin movimientos en el periodo
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -12, bottom: 0 }}
        barGap={2}
        barCategoryGap="20%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="oklch(0.90 0.005 250)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "oklch(0.45 0.02 250)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatAmount(v, prefix)}
          tick={{ fontSize: 11, fill: "oklch(0.50 0.02 250)" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "oklch(0.93 0.01 250)", radius: 4 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
        />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="egresos"
          name="Egresos"
          fill="#f87171"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
          opacity={0.7}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
