"use client";

import Link from "next/link";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_COLORS,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import type { SaleStatus, Currency, SigningStatus } from "@/types/enums";

type SaleRow = {
  id: string;
  saleDate: Date;
  totalPrice: number;
  currency: Currency;
  totalInstallments: number;
  status: SaleStatus;
  lot: { lotNumber: string; development: { name: string; slug: string } };
  person: { id: string; firstName: string; lastName: string };
  seller: { id: string; name: string; lastName: string } | null;
  _count: { installments: number };
  signingSlots?: { id: string; status: string }[];
};

interface Props {
  sales: SaleRow[];
  canManage: boolean;
}

export function SalesTable({ sales, canManage }: Props) {
  const columns: Column<SaleRow>[] = [
    {
      key: "lot",
      label: "Lote",
      render: (sale) => (
        <Link
          href={`/desarrollos/${sale.lot.development.slug}`}
          className="font-medium hover:underline"
        >
          {sale.lot.lotNumber}
        </Link>
      ),
    },
    {
      key: "development",
      label: "Desarrollo",
      render: (sale) => sale.lot.development.name,
    },
    {
      key: "person",
      label: "Comprador",
      render: (sale) => (
        <Link
          href={`/personas/${sale.person.id}`}
          className="hover:underline"
        >
          {sale.person.firstName} {sale.person.lastName}
        </Link>
      ),
    },
    {
      key: "totalPrice",
      label: "Precio",
      render: (sale) => <Price amount={sale.totalPrice} currency={sale.currency as "USD" | "ARS"} />,
    },
    {
      key: "installments",
      label: "Cuotas",
      render: (sale) =>
        sale.totalInstallments === 0 ? "Contado" : sale.totalInstallments,
    },
    {
      key: "status",
      label: "Estado",
      render: (sale) => (
        <StatusBadge
          label={SALE_STATUS_LABELS[sale.status]}
          variant={SALE_STATUS_COLORS[sale.status]}
        />
      ),
    },
    {
      key: "firma",
      label: "Firma",
      render: (sale) => {
        const signing = sale.signingSlots?.[0];
        if (!signing) {
          return <span className="text-muted-foreground">{"\u2014"}</span>;
        }
        return (
          <StatusBadge
            label={SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
            variant={SIGNING_STATUS_COLORS[signing.status as SigningStatus]}
          />
        );
      },
    },
    {
      key: "saleDate",
      label: "Fecha",
      render: (sale) => formatDate(sale.saleDate),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-12",
      render: (sale) => (
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/ventas/${sale.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      data={sales}
      emptyTitle="Sin ventas"
      emptyDescription="No se encontraron ventas. Creá una nueva para empezar."
    />
  );
}
