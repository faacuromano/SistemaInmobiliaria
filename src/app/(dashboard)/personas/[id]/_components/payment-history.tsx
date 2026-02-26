"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { MOVEMENT_TYPE_LABELS } from "@/lib/constants";
import {
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import type { MovementType, Currency } from "@/types/enums";

type CashMovementItem = {
  id: string;
  date: Date;
  type: MovementType;
  concept: string;
  arsIncome: { toString(): string } | null;
  arsExpense: { toString(): string } | null;
  usdIncome: { toString(): string } | null;
  usdExpense: { toString(): string } | null;
};

interface Props {
  movements: CashMovementItem[];
}

const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
});

function getMonthKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function getMonthLabel(date: Date | string): string {
  const d = new Date(date);
  const label = monthFormatter.format(d);
  // Capitalize first letter
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function PaymentHistory({ movements }: Props) {
  if (movements.length === 0) {
    return null;
  }

  // Group movements by month
  const grouped = new Map<string, { label: string; items: CashMovementItem[] }>();
  for (const mov of movements) {
    const key = getMonthKey(mov.date);
    if (!grouped.has(key)) {
      grouped.set(key, { label: getMonthLabel(mov.date), items: [] });
    }
    grouped.get(key)!.items.push(mov);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Pagos ({movements.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[450px] overflow-auto">
          {Array.from(grouped.entries()).map(([monthKey, group]) => (
            <div key={monthKey}>
              <p className="sticky top-0 z-10 bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                {group.label}
              </p>
              <div className="space-y-1 py-1">
                {group.items.map((mov) => {
                  const usdIn = Number(mov.usdIncome) || 0;
                  const usdOut = Number(mov.usdExpense) || 0;
                  const arsIn = Number(mov.arsIncome) || 0;
                  const arsOut = Number(mov.arsExpense) || 0;
                  const isIncome = usdIn > 0 || arsIn > 0;

                  const amounts: { value: number; currency: Currency; isIncome: boolean }[] = [];
                  if (usdIn > 0) amounts.push({ value: usdIn, currency: "USD", isIncome: true });
                  if (usdOut > 0) amounts.push({ value: usdOut, currency: "USD", isIncome: false });
                  if (arsIn > 0) amounts.push({ value: arsIn, currency: "ARS", isIncome: true });
                  if (arsOut > 0) amounts.push({ value: arsOut, currency: "ARS", isIncome: false });

                  return (
                    <div
                      key={mov.id}
                      className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50"
                    >
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                          isIncome
                            ? "bg-emerald-100 dark:bg-emerald-950/30"
                            : "bg-red-100 dark:bg-red-950/30"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {mov.concept}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(new Date(mov.date))}</span>
                          <Badge variant="outline" className="px-1 py-0 text-[10px]">
                            {MOVEMENT_TYPE_LABELS[mov.type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {amounts.map((a, i) => (
                          <p
                            key={i}
                            className={`text-sm font-medium ${
                              a.isIncome ? "text-emerald-600" : "text-red-600"
                            }`}
                          >
                            {a.isIncome ? "+" : "-"}
                            {formatCurrency(a.value, a.currency)}
                          </p>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
