"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import { Price } from "@/components/shared/price";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
} from "@/lib/constants";
import type { MovementType } from "@/types/enums";
import { TrendingUp, TrendingDown, Scale } from "lucide-react";

type MovementRow = {
  id: string;
  date: Date;
  type: string;
  concept: string;
  detail: string | null;
  paymentMethod: string | null;
  arsIncome: number | null;
  arsExpense: number | null;
  usdIncome: number | null;
  usdExpense: number | null;
  development: { name: string } | null;
  sale: { id: string; lot: { lotNumber: string } } | null;
  person: { firstName: string; lastName: string } | null;
  registeredBy: { name: string } | null;
  bankAccount?: { name: string } | null;
};

type LedgerRow = MovementRow & {
  runningUsd: number;
  runningArs: number;
};

interface Props {
  movements: MovementRow[];
}

export function BalanceLedger({ movements }: Props) {
  // Compute running balances (movements come sorted desc, we need asc for balance)
  const { rows, totalUsd, totalArs } = useMemo(() => {
    const sorted = [...movements].reverse(); // oldest first
    let usdBal = 0;
    let arsBal = 0;

    const computed: LedgerRow[] = sorted.map((m) => {
      usdBal += (m.usdIncome ?? 0) - (m.usdExpense ?? 0);
      arsBal += (m.arsIncome ?? 0) - (m.arsExpense ?? 0);
      return { ...m, runningUsd: usdBal, runningArs: arsBal };
    });

    // Reverse back to newest first for display
    computed.reverse();
    return { rows: computed, totalUsd: usdBal, totalArs: arsBal };
  }, [movements]);

  const totalUsdIncome = movements.reduce((s, m) => s + (m.usdIncome ?? 0), 0);
  const totalUsdExpense = movements.reduce((s, m) => s + (m.usdExpense ?? 0), 0);
  const totalArsIncome = movements.reduce((s, m) => s + (m.arsIncome ?? 0), 0);
  const totalArsExpense = movements.reduce((s, m) => s + (m.arsExpense ?? 0), 0);

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">Sin movimientos</p>
          <p className="text-sm">No se encontraron movimientos de caja.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              Balance USD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalUsd >= 0 ? "text-green-600" : "text-red-600"}`}>
              <Price amount={totalUsd} currency="USD" />
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <Price amount={totalUsdIncome} currency="USD" />
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-3.5 w-3.5" />
                <Price amount={totalUsdExpense} currency="USD" />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scale className="h-4 w-4 text-blue-600" />
              Balance ARS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalArs >= 0 ? "text-green-600" : "text-red-600"}`}>
              <Price amount={totalArs} currency="ARS" />
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <Price amount={totalArsIncome} currency="ARS" />
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown className="h-3.5 w-3.5" />
                <Price amount={totalArsExpense} currency="ARS" />
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Libro de Caja ({movements.length} movimientos)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-[8%] px-2 py-2 text-left font-medium text-muted-foreground">Fecha</th>
                <th className="w-[8%] px-2 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="w-[16%] px-2 py-2 text-left font-medium text-muted-foreground">Concepto</th>
                <th className="w-[14%] px-2 py-2 text-left font-medium text-muted-foreground">Detalle</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground">USD Ing.</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground">USD Egr.</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground bg-blue-50 dark:bg-blue-950/30">Saldo USD</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground">ARS Ing.</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground">ARS Egr.</th>
                <th className="w-[9%] px-2 py-2 text-right font-medium text-muted-foreground bg-blue-50 dark:bg-blue-950/30">Saldo ARS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const usdDelta = (row.usdIncome ?? 0) - (row.usdExpense ?? 0);
                const arsDelta = (row.arsIncome ?? 0) - (row.arsExpense ?? 0);
                const hasUsd = (row.usdIncome ?? 0) > 0 || (row.usdExpense ?? 0) > 0;
                const hasArs = (row.arsIncome ?? 0) > 0 || (row.arsExpense ?? 0) > 0;

                // Build detail string
                const details: string[] = [];
                if (row.person) details.push(`${row.person.firstName} ${row.person.lastName}`);
                if (row.development) details.push(row.development.name);
                if (row.sale) details.push(`Lote ${row.sale.lot.lotNumber}`);
                const detailStr = details.join(" · ");

                return (
                  <tr
                    key={row.id}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${
                      idx === 0 ? "bg-muted/20" : ""
                    }`}
                  >
                    <td className="px-2 py-2 tabular-nums truncate">
                      {formatDate(row.date)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge
                        label={MOVEMENT_TYPE_LABELS[row.type as MovementType] ?? row.type}
                        variant={MOVEMENT_TYPE_COLORS[row.type as MovementType] ?? "outline"}
                      />
                    </td>
                    <td className="px-2 py-2 font-medium truncate">
                      {row.concept}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground truncate">
                      {detailStr || "\u2014"}
                    </td>

                    {/* USD columns */}
                    <td className="px-2 py-2 text-right tabular-nums truncate">
                      {row.usdIncome ? (
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(row.usdIncome, "USD")}
                        </span>
                      ) : hasUsd ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums truncate">
                      {row.usdExpense ? (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(row.usdExpense, "USD")}
                        </span>
                      ) : hasUsd ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : null}
                    </td>
                    <td className={`px-2 py-2 text-right tabular-nums truncate font-semibold bg-blue-50/50 dark:bg-blue-950/20 ${
                      row.runningUsd > 0
                        ? "text-green-700 dark:text-green-400"
                        : row.runningUsd < 0
                        ? "text-red-700 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}>
                      {usdDelta !== 0 || hasUsd
                        ? formatCurrency(row.runningUsd, "USD")
                        : ""}
                    </td>

                    {/* ARS columns */}
                    <td className="px-2 py-2 text-right tabular-nums truncate">
                      {row.arsIncome ? (
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(row.arsIncome, "ARS")}
                        </span>
                      ) : hasArs ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums truncate">
                      {row.arsExpense ? (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(row.arsExpense, "ARS")}
                        </span>
                      ) : hasArs ? (
                        <span className="text-muted-foreground">&mdash;</span>
                      ) : null}
                    </td>
                    <td className={`px-2 py-2 text-right tabular-nums truncate font-semibold bg-blue-50/50 dark:bg-blue-950/20 ${
                      row.runningArs > 0
                        ? "text-green-700 dark:text-green-400"
                        : row.runningArs < 0
                        ? "text-red-700 dark:text-red-400"
                        : "text-muted-foreground"
                    }`}>
                      {arsDelta !== 0 || hasArs
                        ? formatCurrency(row.runningArs, "ARS")
                        : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals footer */}
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold">
                <td className="px-2 py-2.5" colSpan={4}>
                  Totales
                </td>
                <td className="px-2 py-2.5 text-right text-green-600 tabular-nums truncate">
                  +{formatCurrency(totalUsdIncome, "USD")}
                </td>
                <td className="px-2 py-2.5 text-right text-red-600 tabular-nums truncate">
                  -{formatCurrency(totalUsdExpense, "USD")}
                </td>
                <td className={`px-2 py-2.5 text-right tabular-nums truncate bg-blue-50 dark:bg-blue-950/30 ${
                  totalUsd >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                }`}>
                  {formatCurrency(totalUsd, "USD")}
                </td>
                <td className="px-2 py-2.5 text-right text-green-600 tabular-nums truncate">
                  +{formatCurrency(totalArsIncome, "ARS")}
                </td>
                <td className="px-2 py-2.5 text-right text-red-600 tabular-nums truncate">
                  -{formatCurrency(totalArsExpense, "ARS")}
                </td>
                <td className={`px-2 py-2.5 text-right tabular-nums truncate bg-blue-50 dark:bg-blue-950/30 ${
                  totalArs >= 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
                }`}>
                  {formatCurrency(totalArs, "ARS")}
                </td>
              </tr>
            </tfoot>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
