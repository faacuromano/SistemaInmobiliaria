"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Price } from "@/components/shared/price";
import type { Currency } from "@/types/enums";

type InstallmentLike = {
  amount: { toString(): string };
  paidAmount: { toString(): string };
  currency: Currency;
  status: string;
};

type SaleLike = {
  totalPrice: { toString(): string };
  currency: Currency;
  status: string;
  installments: InstallmentLike[];
  extraCharges: InstallmentLike[];
};

interface Props {
  sales: SaleLike[];
}

export function DebtSummary({ sales }: Props) {
  const activeSales = sales.filter(
    (s) => s.status === "ACTIVA" || s.status === "CONTADO"
  );

  let totalSoldUsd = 0;
  let totalSoldArs = 0;
  let totalPaidUsd = 0;
  let totalPaidArs = 0;
  let overdueCount = 0;
  let overdueAmountUsd = 0;
  let overdueAmountArs = 0;

  for (const sale of activeSales) {
    const price = Number(sale.totalPrice);
    if (sale.currency === "USD") totalSoldUsd += price;
    else totalSoldArs += price;

    for (const inst of sale.installments) {
      const paid = Number(inst.paidAmount);
      if (inst.currency === "USD") totalPaidUsd += paid;
      else totalPaidArs += paid;

      if (inst.status === "VENCIDA") {
        overdueCount++;
        const remaining = Number(inst.amount) - paid;
        if (inst.currency === "USD") overdueAmountUsd += remaining;
        else overdueAmountArs += remaining;
      }
    }

    for (const ec of sale.extraCharges) {
      const paid = Number(ec.paidAmount);
      if (ec.currency === "USD") totalPaidUsd += paid;
      else totalPaidArs += paid;

      if (ec.status === "VENCIDA") {
        overdueCount++;
        const remaining = Number(ec.amount) - paid;
        if (ec.currency === "USD") overdueAmountUsd += remaining;
        else overdueAmountArs += remaining;
      }
    }
  }

  const pendingUsd = totalSoldUsd - totalPaidUsd;
  const pendingArs = totalSoldArs - totalPaidArs;

  const cards = [
    {
      label: "Total Vendido",
      usd: totalSoldUsd,
      ars: totalSoldArs,
      icon: DollarSign,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Total Pagado",
      usd: totalPaidUsd,
      ars: totalPaidArs,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Deuda Pendiente",
      usd: pendingUsd,
      ars: pendingArs,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Cuotas Vencidas",
      usd: overdueAmountUsd,
      ars: overdueAmountArs,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950/30",
      count: overdueCount,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-start gap-3 p-4">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
            >
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              {"count" in card && card.count !== undefined && (
                <p className={`text-lg font-bold ${card.color}`}>
                  {card.count}
                </p>
              )}
              {card.usd > 0 && (
                <p className="text-sm font-semibold">
                  <Price amount={card.usd} currency="USD" />
                </p>
              )}
              {card.ars > 0 && (
                <p className="text-sm font-semibold">
                  <Price amount={card.ars} currency="ARS" />
                </p>
              )}
              {card.usd === 0 && card.ars === 0 && !("count" in card) && (
                <p className="text-sm font-semibold text-muted-foreground">—</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
