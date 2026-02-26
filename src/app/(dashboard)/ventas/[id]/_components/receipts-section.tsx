"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Eye, Receipt } from "lucide-react";
import { ReceiptViewDialog } from "./receipt-view-dialog";

export interface ReceiptRow {
  id: string;
  receiptNumber: string;
  content: string;
  createdAt: Date;
  cashMovement: {
    id: string;
    date: Date;
    type: string;
    concept: string;
    usdIncome: number | null;
    arsIncome: number | null;
    usdExpense: number | null;
    arsExpense: number | null;
  } | null;
  sale: {
    id: string;
    currency: string;
    lot: {
      lotNumber: string;
      block: string | null;
      development: { name: string };
    };
  } | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string | null;
  } | null;
  generatedBy: {
    id: string;
    name: string;
    lastName: string;
  } | null;
}

interface ReceiptsSectionProps {
  receipts: ReceiptRow[];
  canManage: boolean;
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

function getReceiptColumns(
  onView: (receipt: ReceiptRow) => void
): Column<ReceiptRow>[] {
  return [
    {
      key: "receiptNumber",
      label: "Numero de Recibo",
      render: (item) => (
        <span className="font-medium font-mono text-sm">{item.receiptNumber}</span>
      ),
    },
    {
      key: "date",
      label: "Fecha",
      render: (item) =>
        item.cashMovement ? formatDate(item.cashMovement.date) : formatDate(item.createdAt),
    },
    {
      key: "concept",
      label: "Concepto",
      render: (item) => (
        <span className="text-sm">
          {item.cashMovement?.concept || "\u2014"}
        </span>
      ),
    },
    {
      key: "amount",
      label: "Monto",
      render: (item) => {
        const { amount, currency } = getReceiptAmount(item);
        if (amount === 0) return "\u2014";
        return (
          <span className="font-medium text-green-600">
            {formatCurrency(amount, currency)}
          </span>
        );
      },
    },
    {
      key: "generatedBy",
      label: "Generado por",
      render: (item) =>
        item.generatedBy
          ? `${item.generatedBy.name} ${item.generatedBy.lastName}`
          : "\u2014",
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (item) => (
        <Button variant="outline" size="sm" onClick={() => onView(item)}>
          <Eye className="mr-1 h-4 w-4" />
          Ver
        </Button>
      ),
    },
  ];
}

export function ReceiptsSection({ receipts }: ReceiptsSectionProps) {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRow | null>(null);

  const columns = getReceiptColumns(setSelectedReceipt);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Recibos ({receipts.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={receipts}
            emptyTitle="Sin recibos"
            emptyDescription="No hay recibos generados para esta venta."
          />
        </CardContent>
      </Card>

      {selectedReceipt && (
        <ReceiptViewDialog
          open={!!selectedReceipt}
          onOpenChange={(open) => {
            if (!open) setSelectedReceipt(null);
          }}
          receipt={selectedReceipt}
        />
      )}
    </>
  );
}
