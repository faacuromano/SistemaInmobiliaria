"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  EXTRA_CHARGE_STATUS_LABELS,
  EXTRA_CHARGE_STATUS_COLORS,
} from "@/lib/constants";
import type { Currency, InstallmentStatus, ExtraChargeStatus } from "@/types/enums";

type PendingItem = {
  id: string;
  type: "cuota" | "refuerzo";
  number?: number;
  description?: string;
  lotNumber: string;
  developmentName: string;
  amount: number;
  paidAmount: number;
  currency: Currency;
  dueDate: Date;
  status: InstallmentStatus | ExtraChargeStatus;
};

type SaleLike = {
  status: string;
  lot: { lotNumber: string; development: { name: string } };
  installments: Array<{
    id: string;
    installmentNumber: number;
    amount: { toString(): string };
    paidAmount: { toString(): string };
    currency: Currency;
    dueDate: Date;
    status: InstallmentStatus;
  }>;
  extraCharges: Array<{
    id: string;
    description: string;
    amount: { toString(): string };
    paidAmount: { toString(): string };
    currency: Currency;
    dueDate: Date;
    status: ExtraChargeStatus;
  }>;
};

interface Props {
  sales: SaleLike[];
}

export function PendingInstallments({ sales }: Props) {
  const pendingItems: PendingItem[] = [];

  for (const sale of sales) {
    if (sale.status === "CANCELADA") continue;

    for (const inst of sale.installments) {
      if (inst.status === "PAGADA") continue;
      pendingItems.push({
        id: inst.id,
        type: "cuota",
        number: inst.installmentNumber,
        lotNumber: sale.lot.lotNumber,
        developmentName: sale.lot.development.name,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        currency: inst.currency,
        dueDate: new Date(inst.dueDate),
        status: inst.status,
      });
    }

    for (const ec of sale.extraCharges) {
      if (ec.status === "PAGADA") continue;
      pendingItems.push({
        id: ec.id,
        type: "refuerzo",
        description: ec.description,
        lotNumber: sale.lot.lotNumber,
        developmentName: sale.lot.development.name,
        amount: Number(ec.amount),
        paidAmount: Number(ec.paidAmount),
        currency: ec.currency,
        dueDate: new Date(ec.dueDate),
        status: ec.status,
      });
    }
  }

  pendingItems.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  if (pendingItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuotas Pendientes ({pendingItems.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lote</th>
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Desarrollo</th>
                  <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Monto</th>
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Vencimiento</th>
                  <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pendingItems.map((item) => {
                  const isOverdue = item.status === "VENCIDA";
                  const statusLabel =
                    item.type === "cuota"
                      ? INSTALLMENT_STATUS_LABELS[item.status as InstallmentStatus]
                      : EXTRA_CHARGE_STATUS_LABELS[item.status as ExtraChargeStatus];
                  const statusColor =
                    item.type === "cuota"
                      ? INSTALLMENT_STATUS_COLORS[item.status as InstallmentStatus]
                      : EXTRA_CHARGE_STATUS_COLORS[item.status as ExtraChargeStatus];
                  const remaining = item.amount - item.paidAmount;

                  const isPartial = item.paidAmount > 0 && item.paidAmount < item.amount;

                  return (
                    <tr
                      key={item.id}
                      className={`border-b last:border-0 ${isOverdue ? "bg-red-50/50 dark:bg-red-950/10" : "even:bg-muted/30"}`}
                    >
                      <td className="p-3 text-sm">
                        {item.type === "cuota"
                          ? `Cuota ${item.number}`
                          : item.description || "Refuerzo"}
                      </td>
                      <td className="p-3 text-sm font-medium">
                        {item.lotNumber}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">
                        {item.developmentName}
                      </td>
                      <td className="p-3 text-sm text-right">
                        <p className="font-medium"><Price amount={remaining} currency={item.currency as "USD" | "ARS"} /></p>
                        {isPartial && (
                          <p className="text-xs text-muted-foreground">
                            Pagado: <Price amount={item.paidAmount} currency={item.currency as "USD" | "ARS"} />
                          </p>
                        )}
                      </td>
                      <td
                        className={`p-3 text-sm ${isOverdue ? "text-red-600 font-medium" : ""}`}
                      >
                        {formatDate(item.dueDate)}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={statusColor}>{statusLabel}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
