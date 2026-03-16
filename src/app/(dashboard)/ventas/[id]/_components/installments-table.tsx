"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  EXTRA_CHARGE_STATUS_LABELS,
  EXTRA_CHARGE_STATUS_COLORS,
} from "@/lib/constants";
import type { InstallmentStatus, ExtraChargeStatus } from "@/types/enums";
import { Badge } from "@/components/ui/badge";
import { Plus, Info } from "lucide-react";
import { PayInstallmentDialog } from "./pay-installment-dialog";
import { PayExtraChargeDialog } from "./pay-extra-charge-dialog";
import { AddExtraChargeDialog } from "./add-extra-charge-dialog";

interface InstallmentRow {
  id: string;
  installmentNumber: number;
  amount: number;
  originalAmount: number | null;
  currency: string;
  dueDate: Date;
  monthLabel: string | null;
  status: string;
  paidAmount: number;
  paidDate: Date | null;
  notes: string | null;
}

interface ExtraChargeRow {
  id: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: Date;
  status: string;
  paidAmount: number;
  paidDate: Date | null;
  notes: string | null;
  isInKind?: boolean;
  inKindType?: string | null;
}

interface InstallmentsTableProps {
  installments: InstallmentRow[];
  extraCharges: ExtraChargeRow[];
  canManage: boolean;
  saleId: string;
  signingGateActive?: boolean;
}

function getInstallmentColumns(
  canManage: boolean,
  onPay: (installment: InstallmentRow) => void
): Column<InstallmentRow>[] {
  const columns: Column<InstallmentRow>[] = [
    {
      key: "number",
      label: "#",
      className: "w-12",
      render: (item) => (
        <span className="font-medium">{item.installmentNumber}</span>
      ),
    },
    {
      key: "monthLabel",
      label: "Mes",
      render: (item) => item.monthLabel || "\u2014",
    },
    {
      key: "dueDate",
      label: "Vencimiento",
      render: (item) => formatDate(item.dueDate),
    },
    {
      key: "amount",
      label: "Monto",
      render: (item) => {
        const wasAdjusted =
          item.originalAmount !== null &&
          item.originalAmount !== item.amount;

        if (wasAdjusted) {
          return (
            <div className="flex items-center gap-1">
              <Price amount={item.amount} currency={item.currency as "USD" | "ARS"} className="font-medium" />
              <span className="text-xs text-muted-foreground line-through">
                <Price amount={item.originalAmount!} currency={item.currency as "USD" | "ARS"} />
              </span>
              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                Ajustada
              </Badge>
            </div>
          );
        }
        return <Price amount={item.amount} currency={item.currency as "USD" | "ARS"} className="font-medium" />;
      },
    },
    {
      key: "paidAmount",
      label: "Pagado",
      render: (item) =>
        item.paidAmount > 0
          ? <Price amount={item.paidAmount} currency={item.currency as "USD" | "ARS"} />
          : "\u2014",
    },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <StatusBadge
          label={
            INSTALLMENT_STATUS_LABELS[item.status as InstallmentStatus]
          }
          variant={
            INSTALLMENT_STATUS_COLORS[item.status as InstallmentStatus]
          }
        />
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "Acciones",
      className: "w-24",
      render: (item) => {
        const canPay =
          item.status === "PENDIENTE" ||
          item.status === "PARCIAL" ||
          item.status === "VENCIDA";
        if (!canPay) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPay(item)}
          >
            Pagar
          </Button>
        );
      },
    });
  }

  return columns;
}

function getExtraChargeColumns(
  canManage: boolean,
  onPay: (extraCharge: ExtraChargeRow) => void
): Column<ExtraChargeRow>[] {
  const columns: Column<ExtraChargeRow>[] = [
    {
      key: "description",
      label: "Descripcion",
      render: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.description}</span>
            {item.isInKind && (
              <Badge variant="secondary" className="text-xs">
                En especie{item.inKindType ? ` - ${item.inKindType}` : ""}
              </Badge>
            )}
          </div>
          {item.notes && (
            <p className="text-xs text-muted-foreground leading-tight">
              {item.notes}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "dueDate",
      label: "Fecha",
      render: (item) => (
        <span className="text-sm">
          {formatDate(item.dueDate)}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Monto",
      render: (item) => (
        <Price amount={item.amount} currency={item.currency as "USD" | "ARS"} className="font-medium" />
      ),
    },
    {
      key: "paidAmount",
      label: "Pagado",
      render: (item) =>
        item.paidAmount > 0
          ? <Price amount={item.paidAmount} currency={item.currency as "USD" | "ARS"} />
          : "\u2014",
    },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <StatusBadge
          label={
            EXTRA_CHARGE_STATUS_LABELS[item.status as ExtraChargeStatus]
          }
          variant={
            EXTRA_CHARGE_STATUS_COLORS[item.status as ExtraChargeStatus]
          }
        />
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "Acciones",
      className: "w-24",
      render: (item) => {
        const canPay =
          item.status === "PENDIENTE" ||
          item.status === "PARCIAL" ||
          item.status === "VENCIDA";
        if (!canPay) return null;
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPay(item)}
          >
            Pagar
          </Button>
        );
      },
    });
  }

  return columns;
}

export function InstallmentsTable({
  installments,
  extraCharges,
  canManage,
  saleId,
}: InstallmentsTableProps) {
  const [selectedInstallment, setSelectedInstallment] =
    useState<InstallmentRow | null>(null);
  const [selectedExtraCharge, setSelectedExtraCharge] =
    useState<ExtraChargeRow | null>(null);
  const [showAddExtraCharge, setShowAddExtraCharge] = useState(false);

  // Compute summary stats
  const paidCount = installments.filter((i) => i.status === "PAGADA").length;
  const overdueCount = installments.filter(
    (i) => i.status === "VENCIDA"
  ).length;
  const parcialCount = installments.filter(
    (i) => i.status === "PARCIAL"
  ).length;
  const pendingCount = installments.filter(
    (i) => i.status === "PENDIENTE"
  ).length;

  const remainingBalance = installments
    .filter((i) => i.status !== "PAGADA")
    .reduce((acc, i) => acc + (i.amount - i.paidAmount), 0);

  const hasAdjustedInstallments = installments.some(
    (i) => i.originalAmount !== null && i.originalAmount !== i.amount
  );

  const paidExtraCharges = extraCharges.filter(
    (ec) => ec.status === "PAGADA"
  );

  const installmentColumns = getInstallmentColumns(
    canManage,
    setSelectedInstallment
  );
  const extraChargeColumns = getExtraChargeColumns(
    canManage,
    setSelectedExtraCharge
  );

  return (
    <div className="space-y-6">
      {/* Installments */}
      <Card>
        <CardHeader>
          <CardTitle>Cuotas ({installments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary bar */}
          {installments.length > 0 && (
            <div className="flex flex-wrap gap-3 rounded-md border bg-card p-3 shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm">
                  <span className="font-medium">{paidCount}</span>{" "}
                  <span className="text-muted-foreground">pagadas</span>
                </span>
              </div>
              {parcialCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-sm">
                    <span className="font-medium">{parcialCount}</span>{" "}
                    <span className="text-muted-foreground">parciales</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="text-sm">
                  <span className="font-medium">{pendingCount}</span>{" "}
                  <span className="text-muted-foreground">pendientes</span>
                </span>
              </div>
              {overdueCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-sm">
                    <span className="font-medium">{overdueCount}</span>{" "}
                    <span className="text-muted-foreground">vencidas</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <DataTable
            columns={installmentColumns}
            data={installments}
            emptyTitle="Sin cuotas"
            emptyDescription="Esta venta no tiene cuotas generadas."
          />

          {/* Adjustment explanation */}
          {hasAdjustedInstallments && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-fluent text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Cuotas ajustadas por refuerzos</p>
                <p className="text-xs mt-0.5">
                  Las cuotas marcadas como &quot;Ajustada&quot; fueron
                  recalculadas al pagarse un refuerzo. El monto original se
                  muestra tachado como referencia.
                  {paidExtraCharges.length > 0 && (
                    <> Se aplicaron {paidExtraCharges.length} refuerzo(s) por un total de{" "}
                      <Price
                        amount={paidExtraCharges.reduce((acc, ec) => acc + ec.amount, 0)}
                        currency={paidExtraCharges[0]?.currency as "USD" | "ARS" ?? "USD"}
                      />
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extra Charges */}
      {(extraCharges.length > 0 || canManage) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Refuerzos ({extraCharges.length})</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Pagos adicionales que reducen las cuotas pendientes
              </p>
            </div>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddExtraCharge(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Agregar Refuerzo
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              columns={extraChargeColumns}
              data={extraCharges}
              emptyTitle="Sin refuerzos"
              emptyDescription="No hay cuotas de refuerzo registradas. Al pagar un refuerzo, las cuotas pendientes se reducen automaticamente."
            />
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {selectedInstallment && (
        <PayInstallmentDialog
          open={!!selectedInstallment}
          onOpenChange={(open) => {
            if (!open) setSelectedInstallment(null);
          }}
          installment={selectedInstallment}
        />
      )}

      {selectedExtraCharge && (
        <PayExtraChargeDialog
          open={!!selectedExtraCharge}
          onOpenChange={(open) => {
            if (!open) setSelectedExtraCharge(null);
          }}
          extraCharge={selectedExtraCharge}
        />
      )}

      {canManage && (
        <AddExtraChargeDialog
          open={showAddExtraCharge}
          onOpenChange={setShowAddExtraCharge}
          saleId={saleId}
          remainingBalance={remainingBalance}
          saleCurrency={(installments[0]?.currency ?? "USD") as "USD" | "ARS"}
        />
      )}
    </div>
  );
}
