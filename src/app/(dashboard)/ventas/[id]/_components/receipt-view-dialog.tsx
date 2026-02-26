"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReceiptRow } from "./receipts-section";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptRow;
}

function getReceiptAmount(receipt: ReceiptRow): { amount: number; currency: "USD" | "ARS" } {
  const cm = receipt.cashMovement;
  if (!cm) return { amount: 0, currency: "USD" };

  if (cm.usdIncome && cm.usdIncome > 0) {
    return { amount: cm.usdIncome, currency: "USD" };
  }
  if (cm.arsIncome && cm.arsIncome > 0) {
    return { amount: cm.arsIncome, currency: "ARS" };
  }
  return { amount: 0, currency: (receipt.sale?.currency as "USD" | "ARS") || "USD" };
}

export function ReceiptViewDialog({ open, onOpenChange, receipt }: Props) {
  const { amount, currency } = getReceiptAmount(receipt);
  const personName = receipt.person
    ? `${receipt.person.firstName} ${receipt.person.lastName}`
    : "\u2014";
  const personDni = receipt.person?.dni || null;

  const lot = receipt.sale?.lot;
  const lotLabel = lot
    ? lot.block
      ? `Lote ${lot.lotNumber} - Mz ${lot.block}`
      : `Lote ${lot.lotNumber}`
    : "\u2014";
  const devName = lot?.development?.name || "\u2014";
  const concept = receipt.cashMovement?.concept || "\u2014";
  const receiptDate = receipt.cashMovement
    ? formatDate(receipt.cashMovement.date)
    : formatDate(receipt.createdAt);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader className="print:hidden">
          <DialogTitle>Recibo de Pago</DialogTitle>
        </DialogHeader>

        {/* Print styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [data-receipt-print],
            [data-receipt-print] * {
              visibility: visible;
            }
            [data-receipt-print] {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 40px;
              font-size: 14px;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>

        <div data-receipt-print className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              Sistema Inmobiliaria
            </h2>
            <p className="text-sm text-muted-foreground">
              Recibo de Pago
            </p>
          </div>

          <Separator />

          {/* Receipt Number and Date */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Numero de Recibo</p>
              <p className="font-mono font-bold text-lg">
                {receipt.receiptNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Fecha</p>
              <p className="font-medium">{receiptDate}</p>
            </div>
          </div>

          <Separator />

          {/* Client Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Cliente
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div>
                <p className="text-xs text-muted-foreground">Nombre</p>
                <p className="font-medium">{personName}</p>
              </div>
              {personDni && (
                <div>
                  <p className="text-xs text-muted-foreground">DNI</p>
                  <p className="font-medium">{personDni}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Detalle del Pago
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Concepto</p>
                <p className="font-medium">{concept}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>
                  <p className="text-xs text-muted-foreground">Desarrollo</p>
                  <p className="font-medium">{devName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lote</p>
                  <p className="font-medium">{lotLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Amount */}
          <div className="rounded-sm border bg-muted/50 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Monto Recibido</p>
            <p className="text-2xl font-bold">
              {amount > 0 ? formatCurrency(amount, currency) : "\u2014"}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-2">
            <p>
              Generado por: {receipt.generatedBy
                ? `${receipt.generatedBy.name} ${receipt.generatedBy.lastName}`
                : "\u2014"}
            </p>
            <p className="mt-1">
              Este recibo es un comprobante interno de pago.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
