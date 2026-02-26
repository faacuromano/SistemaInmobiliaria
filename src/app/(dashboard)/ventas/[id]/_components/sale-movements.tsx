"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPE_COLORS,
} from "@/lib/constants";
import type { MovementType } from "@/types/enums";

interface SaleMovement {
  id: string;
  date: Date;
  type: string;
  concept: string;
  arsIncome: number | null;
  usdIncome: number | null;
  arsExpense: number | null;
  usdExpense: number | null;
}

interface SaleMovementsProps {
  movements: SaleMovement[];
}

function MovementAmount({ movement }: { movement: SaleMovement }) {
  if (movement.usdIncome && movement.usdIncome > 0) {
    return (
      <span className="font-medium text-green-600">
        +<Price amount={movement.usdIncome} currency="USD" />
      </span>
    );
  }
  if (movement.arsIncome && movement.arsIncome > 0) {
    return (
      <span className="font-medium text-green-600">
        +<Price amount={movement.arsIncome} currency="ARS" />
      </span>
    );
  }
  if (movement.usdExpense && movement.usdExpense > 0) {
    return (
      <span className="font-medium text-red-600">
        -<Price amount={movement.usdExpense} currency="USD" />
      </span>
    );
  }
  if (movement.arsExpense && movement.arsExpense > 0) {
    return (
      <span className="font-medium text-red-600">
        -<Price amount={movement.arsExpense} currency="ARS" />
      </span>
    );
  }
  return <span>{"\u2014"}</span>;
}

const movementColumns: Column<SaleMovement>[] = [
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
        label={MOVEMENT_TYPE_LABELS[item.type as MovementType] || item.type}
        variant={MOVEMENT_TYPE_COLORS[item.type as MovementType] || "default"}
      />
    ),
  },
  {
    key: "concept",
    label: "Concepto",
    render: (item) => <span className="font-medium">{item.concept}</span>,
  },
  {
    key: "amount",
    label: "Monto",
    render: (item) => <MovementAmount movement={item} />,
  },
];

export function SaleMovements({ movements }: SaleMovementsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Movimientos de Caja ({movements.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={movementColumns}
          data={movements}
          emptyTitle="Sin movimientos"
          emptyDescription="No hay movimientos de caja registrados para esta venta."
        />
      </CardContent>
    </Card>
  );
}
