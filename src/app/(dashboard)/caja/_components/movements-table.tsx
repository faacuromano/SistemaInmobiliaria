"use client";

import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import type { MovementType } from "@/types/enums";

type MovementRow = {
  id: string;
  date: Date;
  type: string;
  concept: string;
  arsIncome: number | null;
  arsExpense: number | null;
  usdIncome: number | null;
  usdExpense: number | null;
  development: { name: string } | null;
  sale: { id: string; lot: { lotNumber: string } } | null;
  person: { firstName: string; lastName: string } | null;
  registeredBy: { name: string } | null;
};

interface Props {
  movements: MovementRow[];
}

export function MovementsTable({ movements }: Props) {
  const columns: Column<MovementRow>[] = [
    {
      key: "date",
      label: "Fecha",
      render: (item) => formatDate(item.date),
    },
    {
      key: "type",
      label: "Tipo",
      render: (item) => (
        <StatusBadge
          label={MOVEMENT_TYPE_LABELS[item.type as MovementType] ?? item.type}
          variant={MOVEMENT_TYPE_COLORS[item.type as MovementType] ?? "outline"}
        />
      ),
    },
    {
      key: "concept",
      label: "Concepto",
      render: (item) => <span className="font-medium">{item.concept}</span>,
    },
    {
      key: "usdIncome",
      label: "Ingreso USD",
      render: (item) =>
        item.usdIncome ? (
          <span className="text-green-600">
            <Price amount={item.usdIncome} currency="USD" />
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "usdExpense",
      label: "Egreso USD",
      render: (item) =>
        item.usdExpense ? (
          <span className="text-red-600">
            <Price amount={item.usdExpense} currency="USD" />
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "arsIncome",
      label: "Ingreso ARS",
      render: (item) =>
        item.arsIncome ? (
          <span className="text-green-600">
            <Price amount={item.arsIncome} currency="ARS" />
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "arsExpense",
      label: "Egreso ARS",
      render: (item) =>
        item.arsExpense ? (
          <span className="text-red-600">
            <Price amount={item.arsExpense} currency="ARS" />
          </span>
        ) : (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "development",
      label: "Desarrollo",
      render: (item) =>
        item.development?.name ?? (
          <span className="text-muted-foreground">&mdash;</span>
        ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={movements}
      emptyTitle="Sin movimientos"
      emptyDescription="No se encontraron movimientos de caja."
    />
  );
}
