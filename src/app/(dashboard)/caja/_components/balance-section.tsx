"use client";

import { useState, useTransition, useEffect } from "react";
import {
  getCashBalances,
  generateAllBalances,
} from "@/server/actions/cash-balance.actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { Price } from "@/components/shared/price";
import { MONTH_NAMES } from "@/lib/sale-helpers";

type BalanceRow = {
  id: string;
  month: number;
  year: number;
  arsBalance: number;
  usdBalance: number;
  closedAt: string | null;
  development: { id: string; name: string } | null;
};

interface BalanceSectionProps {
  developments: Array<{ id: string; name: string }>;
  canManage: boolean;
  initialBalances: BalanceRow[];
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
const monthOptions = MONTH_NAMES.map((name, idx) => ({
  value: idx + 1,
  label: name.charAt(0) + name.slice(1).toLowerCase(),
}));

export function BalanceSection({
  developments,
  canManage,
  initialBalances,
}: BalanceSectionProps) {
  const [year, setYear] = useState<number>(currentYear);
  const [developmentId, setDevelopmentId] = useState<string>("all");
  const [generateMonth, setGenerateMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [balances, setBalances] = useState<BalanceRow[]>(initialBalances);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerating] = useTransition();

  // Re-fetch when filters change
  useEffect(() => {
    startTransition(async () => {
      const result = await getCashBalances({
        year,
        developmentId: developmentId !== "all" ? developmentId : undefined,
      });
      setBalances(result as BalanceRow[]);
    });
  }, [year, developmentId]);

  function handleGenerate() {
    startGenerating(async () => {
      const result = await generateAllBalances(generateMonth, year);
      if (result.success) {
        // Refresh the table
        const updated = await getCashBalances({
          year,
          developmentId: developmentId !== "all" ? developmentId : undefined,
        });
        setBalances(updated as BalanceRow[]);
      }
    });
  }

  // Calculate totals
  const totals = balances.reduce(
    (acc, b) => ({
      usdBalance: acc.usdBalance + b.usdBalance,
      arsBalance: acc.arsBalance + b.arsBalance,
    }),
    { usdBalance: 0, arsBalance: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Filters and Generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{"A\u00f1o"}</span>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={"A\u00f1o"} />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Desarrollo</span>
              <Select value={developmentId} onValueChange={setDevelopmentId}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Desarrollo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los desarrollos</SelectItem>
                  {developments.map((dev) => (
                    <SelectItem key={dev.id} value={dev.id}>
                      {dev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    Mes a generar
                  </span>
                  <Select
                    value={String(generateMonth)}
                    onValueChange={(v) => setGenerateMonth(Number(v))}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  variant="default"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Generar Balances
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Balances Table */}
      <div className="rounded-sm border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead>Desarrollo</TableHead>
              <TableHead className="text-right">Saldo USD</TableHead>
              <TableHead className="text-right">Saldo ARS</TableHead>
              <TableHead className="text-right">Cerrado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : balances.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay balances para el periodo seleccionado.
                </TableCell>
              </TableRow>
            ) : (
              balances.map((balance) => (
                <TableRow key={balance.id}>
                  <TableCell className="font-medium">
                    {MONTH_NAMES[balance.month - 1]} {balance.year}
                  </TableCell>
                  <TableCell>
                    {balance.development?.name ?? (
                      <span className="text-muted-foreground">Sin desarrollo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        balance.usdBalance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      <Price amount={balance.usdBalance} currency="USD" />
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        balance.arsBalance >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      <Price amount={balance.arsBalance} currency="ARS" />
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {balance.closedAt
                      ? new Date(balance.closedAt).toLocaleDateString("es-AR")
                      : "\u2014"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {balances.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Totales</TableCell>
                <TableCell />
                <TableCell className="text-right font-bold">
                  <span
                    className={
                      totals.usdBalance >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    <Price amount={totals.usdBalance} currency="USD" />
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold">
                  <span
                    className={
                      totals.arsBalance >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    <Price amount={totals.arsBalance} currency="ARS" />
                  </span>
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
