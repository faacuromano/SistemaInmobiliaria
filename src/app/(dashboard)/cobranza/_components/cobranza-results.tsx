"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  INSTALLMENT_STATUS_LABELS,
  INSTALLMENT_STATUS_COLORS,
  EXTRA_CHARGE_STATUS_LABELS,
  EXTRA_CHARGE_STATUS_COLORS,
} from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { PayInstallmentDialog } from "@/app/(dashboard)/ventas/[id]/_components/pay-installment-dialog";
import { PayExtraChargeDialog } from "@/app/(dashboard)/ventas/[id]/_components/pay-extra-charge-dialog";
import { User, MapPin, FileText, Phone, Search } from "lucide-react";
import type { InstallmentStatus, ExtraChargeStatus } from "@/types/enums";

type InstallmentRow = {
  id: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  currency: string;
  dueDate: Date;
  monthLabel: string | null;
  status: string;
};

type ExtraChargeRow = {
  id: string;
  description: string;
  amount: number;
  paidAmount: number;
  currency: string;
  dueDate: Date;
  status: string;
};

type SaleRow = {
  id: string;
  totalPrice: number;
  currency: string;
  totalInstallments: number;
  status: string;
  lot: {
    lotNumber: string;
    block: string | null;
    developmentName: string;
  };
  installments: InstallmentRow[];
  extraCharges: ExtraChargeRow[];
};

type PersonResult = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string | null;
  cuit: string | null;
  phone: string | null;
  sales: SaleRow[];
};

interface Props {
  results: PersonResult[];
  search: string;
  canManage: boolean;
  bankAccounts?: Array<{ id: string; name: string }>;
}

export function CobranzaResults({ results, search, canManage, bankAccounts = [] }: Props) {
  const [payingInstallment, setPayingInstallment] = useState<InstallmentRow | null>(null);
  const [payingExtraCharge, setPayingExtraCharge] = useState<ExtraChargeRow | null>(null);

  if (!search) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Search className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">Buscar una persona para ver sus cuotas pendientes</p>
        <p className="text-sm">Ingrese nombre, apellido, DNI o CUIT en el buscador</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <User className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No se encontraron personas</p>
        <p className="text-sm">Intente con otro nombre, DNI o CUIT</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {results.length} persona{results.length !== 1 ? "s" : ""} encontrada{results.length !== 1 ? "s" : ""}
      </p>

      {results.map((person) => (
        <Card key={person.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">
                  {person.lastName}, {person.firstName}
                </CardTitle>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  {person.dni && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      DNI: {person.dni}
                    </span>
                  )}
                  {person.cuit && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      CUIT: {person.cuit}
                    </span>
                  )}
                  {person.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {person.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {person.sales.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Sin ventas activas con cuotas pendientes
              </p>
            ) : (
              person.sales.map((sale) => (
                <SaleInstallments
                  key={sale.id}
                  sale={sale}
                  canManage={canManage}
                  onPayInstallment={setPayingInstallment}
                  onPayExtraCharge={setPayingExtraCharge}
                />
              ))
            )}
          </CardContent>
        </Card>
      ))}

      {payingInstallment && (
        <PayInstallmentDialog
          open={!!payingInstallment}
          onOpenChange={(open) => {
            if (!open) setPayingInstallment(null);
          }}
          installment={payingInstallment}
          bankAccounts={bankAccounts}
        />
      )}

      {payingExtraCharge && (
        <PayExtraChargeDialog
          open={!!payingExtraCharge}
          onOpenChange={(open) => {
            if (!open) setPayingExtraCharge(null);
          }}
          extraCharge={payingExtraCharge}
          bankAccounts={bankAccounts}
        />
      )}
    </div>
  );
}

function SaleInstallments({
  sale,
  canManage,
  onPayInstallment,
  onPayExtraCharge,
}: {
  sale: SaleRow;
  canManage: boolean;
  onPayInstallment: (inst: InstallmentRow) => void;
  onPayExtraCharge: (ec: ExtraChargeRow) => void;
}) {
  const totalPending = sale.installments.length + sale.extraCharges.length;

  return (
    <div className="rounded-sm border">
      <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-2.5">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <span className="font-medium">
            Lote {sale.lot.lotNumber}
            {sale.lot.block ? ` - Mz ${sale.lot.block}` : ""}
          </span>
          <span className="text-muted-foreground"> — {sale.lot.developmentName}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          Total: {formatCurrency(sale.totalPrice, sale.currency as "USD" | "ARS")}
          {" | "}{totalPending} pendiente{totalPending !== 1 ? "s" : ""}
        </span>
      </div>

      {sale.installments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Mes</th>
                <th className="px-4 py-2 font-medium">Vencimiento</th>
                <th className="px-4 py-2 font-medium text-right">Monto</th>
                <th className="px-4 py-2 font-medium text-right">Pagado</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                {canManage && <th className="px-4 py-2 font-medium text-right">Accion</th>}
              </tr>
            </thead>
            <tbody>
              {sale.installments.map((inst) => {
                const remaining = inst.amount - inst.paidAmount;
                const isOverdue = inst.status === "VENCIDA";
                return (
                  <tr
                    key={inst.id}
                    className={`border-b last:border-0 ${isOverdue ? "bg-destructive/5" : ""}`}
                  >
                    <td className="px-4 py-2">{inst.installmentNumber}</td>
                    <td className="px-4 py-2">{inst.monthLabel ?? "—"}</td>
                    <td className="px-4 py-2">{formatDate(inst.dueDate)}</td>
                    <td className="px-4 py-2 text-right font-mono">
                      {formatCurrency(inst.amount, inst.currency as "USD" | "ARS")}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {inst.paidAmount > 0
                        ? formatCurrency(inst.paidAmount, inst.currency as "USD" | "ARS")
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge
                        label={INSTALLMENT_STATUS_LABELS[inst.status as InstallmentStatus]}
                        variant={INSTALLMENT_STATUS_COLORS[inst.status as InstallmentStatus]}
                      />
                    </td>
                    {canManage && (
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onPayInstallment(inst)}
                        >
                          Pagar {formatCurrency(remaining, inst.currency as "USD" | "ARS")}
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {sale.extraCharges.length > 0 && (
        <>
          {sale.installments.length > 0 && (
            <div className="border-t px-4 py-1.5 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Refuerzos
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium" colSpan={2}>Descripcion</th>
                  <th className="px-4 py-2 font-medium">Vencimiento</th>
                  <th className="px-4 py-2 font-medium text-right">Monto</th>
                  <th className="px-4 py-2 font-medium text-right">Pagado</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  {canManage && <th className="px-4 py-2 font-medium text-right">Accion</th>}
                </tr>
              </thead>
              <tbody>
                {sale.extraCharges.map((ec) => {
                  const remaining = ec.amount - ec.paidAmount;
                  return (
                    <tr key={ec.id} className="border-b last:border-0">
                      <td className="px-4 py-2" colSpan={2}>{ec.description}</td>
                      <td className="px-4 py-2">{formatDate(ec.dueDate)}</td>
                      <td className="px-4 py-2 text-right font-mono">
                        {formatCurrency(ec.amount, ec.currency as "USD" | "ARS")}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {ec.paidAmount > 0
                          ? formatCurrency(ec.paidAmount, ec.currency as "USD" | "ARS")
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge
                          label={EXTRA_CHARGE_STATUS_LABELS[ec.status as ExtraChargeStatus]}
                          variant={EXTRA_CHARGE_STATUS_COLORS[ec.status as ExtraChargeStatus]}
                        />
                      </td>
                      {canManage && (
                        <td className="px-4 py-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onPayExtraCharge(ec)}
                          >
                            Pagar {formatCurrency(remaining, ec.currency as "USD" | "ARS")}
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
