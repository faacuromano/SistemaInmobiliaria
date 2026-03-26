"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface StatusData {
  name: string;
  value: number;
  color: string;
}

interface SalesStatusChartProps {
  data: StatusData[];
  total: number;
}

export function SalesStatusChart({ data, total }: SalesStatusChartProps) {
  const filtered = data.filter((d) => d.value > 0);

  if (filtered.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Sin ventas registradas
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut */}
      <div className="relative h-[160px] w-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {filtered.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight">{total}</span>
          <span className="text-[11px] text-muted-foreground">ventas</span>
        </div>
      </div>

      {/* Legend with progress bars */}
      <div className="w-full space-y-2.5 px-1">
        {filtered.map((item) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name}>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-semibold tabular-nums">
                  {item.value}{" "}
                  <span className="font-normal text-muted-foreground">
                    ({pct}%)
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
