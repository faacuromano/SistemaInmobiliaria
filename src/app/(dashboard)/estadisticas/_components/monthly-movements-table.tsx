"use client";

import { useState, useMemo } from "react";
import { Price } from "@/components/shared/price";
import { MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MovementType } from "@/types/enums";

// ── Color map for movement types ─────────────────────────────────────
// Using Tailwind colors for visual differentiation.
// Income types get green/blue tones, expense types get red/orange/amber tones.
const MOVEMENT_TYPE_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  CUOTA: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  ENTREGA: { bg: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300" },
  COMISION: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300" },
  SUELDO: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  CAMBIO: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300" },
  RETIRO: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
  GASTO_PROYECTO: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300" },
  GASTO_OFICINA: { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300" },
  FIDEICOMISO: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  BANCO: { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300" },
  CONTABLE: { bg: "bg-slate-100 dark:bg-slate-900/40", text: "text-slate-700 dark:text-slate-300" },
  PRESTAMO: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300" },
  IMPUESTO: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300" },
  ALQUILER: { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300" },
  MARKETING: { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40", text: "text-fuchsia-700 dark:text-fuchsia-300" },
  COCHERA: { bg: "bg-lime-100 dark:bg-lime-900/40", text: "text-lime-700 dark:text-lime-300" },
  DESARROLLO: { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300" },
  VARIOS: { bg: "bg-gray-100 dark:bg-gray-900/40", text: "text-gray-700 dark:text-gray-300" },
};

function TypeBadge({ type }: { type: string }) {
  const colors = MOVEMENT_TYPE_COLOR_MAP[type] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  const label = MOVEMENT_TYPE_LABELS[type as MovementType] ?? type;
  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} border-transparent text-[11px]`}
    >
      {label}
    </Badge>
  );
}

// ── Types ────────────────────────────────────────────────────────────
interface MonthlyRow {
  month: number;
  label: string;
  usdIncome: number;
  usdExpense: number;
  arsIncome: number;
  arsExpense: number;
  netUsd: number;
}

interface MovementByType {
  month: number;
  type: string;
  usdIncome: number;
  usdExpense: number;
  arsIncome: number;
  arsExpense: number;
}

interface Props {
  monthlyData: MonthlyRow[];
  movementsByType: MovementByType[];
  selectedYear: number;
}

const MONTH_LABELS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function MonthlyMovementsTable({ monthlyData, movementsByType, selectedYear }: Props) {
  const [selectedType, setSelectedType] = useState<string>("all");

  // Determine which types are present in the data
  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    for (const m of movementsByType) {
      types.add(m.type);
    }
    return Array.from(types).sort();
  }, [movementsByType]);

  // Compute filtered monthly data based on selected type
  const filteredMonthlyData = useMemo(() => {
    if (selectedType === "all") {
      return monthlyData;
    }

    // Aggregate movementsByType for the selected type
    const monthMap = new Map<number, MonthlyRow>();
    for (let m = 0; m < 12; m++) {
      monthMap.set(m, {
        month: m,
        label: MONTH_LABELS[m],
        usdIncome: 0,
        usdExpense: 0,
        arsIncome: 0,
        arsExpense: 0,
        netUsd: 0,
      });
    }

    for (const entry of movementsByType) {
      if (entry.type !== selectedType) continue;
      const row = monthMap.get(entry.month)!;
      row.usdIncome += entry.usdIncome;
      row.usdExpense += entry.usdExpense;
      row.arsIncome += entry.arsIncome;
      row.arsExpense += entry.arsExpense;
    }

    return Array.from(monthMap.values()).map((row) => ({
      ...row,
      netUsd: row.usdIncome - row.usdExpense,
    }));
  }, [selectedType, monthlyData, movementsByType]);

  // Find max USD income for bar width calculation
  const maxUsdIncome = Math.max(...filteredMonthlyData.map((r) => r.usdIncome), 1);

  // Get the distinct types present per month (for badges in the "all" view)
  const typesByMonth = useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const entry of movementsByType) {
      if (!map.has(entry.month)) {
        map.set(entry.month, new Set());
      }
      map.get(entry.month)!.add(entry.type);
    }
    return map;
  }, [movementsByType]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Movimientos Mensuales — {selectedYear}
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipo:</span>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos los tipos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  <span className="flex items-center gap-2">
                    <TypeBadge type={type} />
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Mes</th>
                {selectedType === "all" && (
                  <th className="pb-2 pr-4 font-medium">Tipos</th>
                )}
                <th className="pb-2 pr-4 font-medium">Ingresos USD</th>
                <th className="pb-2 pr-4 font-medium min-w-[120px]"></th>
                <th className="pb-2 pr-4 font-medium">Ingresos ARS</th>
                <th className="pb-2 pr-4 font-medium">Egresos USD</th>
                <th className="pb-2 pr-4 font-medium">Egresos ARS</th>
                <th className="pb-2 font-medium">Saldo Neto USD</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthlyData.map((row) => {
                const barWidth = maxUsdIncome > 0
                  ? Math.round((row.usdIncome / maxUsdIncome) * 100)
                  : 0;
                const monthTypes = typesByMonth.get(row.month);

                return (
                  <tr key={row.month} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{row.label}</td>
                    {selectedType === "all" && (
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {monthTypes && Array.from(monthTypes).sort().map((type) => (
                            <TypeBadge key={type} type={type} />
                          ))}
                        </div>
                      </td>
                    )}
                    <td className="py-2 pr-4 text-right tabular-nums">
                      <Price amount={row.usdIncome} currency="USD" />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="h-3 w-full rounded-sm bg-muted">
                        <div
                          className="h-3 rounded-sm bg-primary transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      <Price amount={row.arsIncome} currency="ARS" />
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-red-600">
                      {row.usdExpense > 0
                        ? <>-<Price amount={row.usdExpense} currency="USD" /></>
                        : <Price amount={0} currency="USD" />}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-red-600">
                      {row.arsExpense > 0
                        ? <>-<Price amount={row.arsExpense} currency="ARS" /></>
                        : <Price amount={0} currency="ARS" />}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums font-semibold ${
                        row.netUsd >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      <Price amount={row.netUsd} currency="USD" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 font-semibold">
                <td className="py-2 pr-4">Total</td>
                {selectedType === "all" && <td className="py-2 pr-4" />}
                <td className="py-2 pr-4 text-right tabular-nums">
                  <Price amount={filteredMonthlyData.reduce((s, r) => s + r.usdIncome, 0)} currency="USD" />
                </td>
                <td className="py-2 pr-4" />
                <td className="py-2 pr-4 text-right tabular-nums">
                  <Price amount={filteredMonthlyData.reduce((s, r) => s + r.arsIncome, 0)} currency="ARS" />
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-red-600">
                  -<Price amount={filteredMonthlyData.reduce((s, r) => s + r.usdExpense, 0)} currency="USD" />
                </td>
                <td className="py-2 pr-4 text-right tabular-nums text-red-600">
                  -<Price amount={filteredMonthlyData.reduce((s, r) => s + r.arsExpense, 0)} currency="ARS" />
                </td>
                <td
                  className={`py-2 text-right tabular-nums ${
                    filteredMonthlyData.reduce((s, r) => s + r.netUsd, 0) >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  <Price amount={filteredMonthlyData.reduce((s, r) => s + r.netUsd, 0)} currency="USD" />
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
