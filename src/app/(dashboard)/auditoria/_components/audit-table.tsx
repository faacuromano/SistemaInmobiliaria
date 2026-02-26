"use client";

import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: unknown;
  newData: unknown;
  ipAddress: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    lastName: string;
  };
};

const ENTITY_LABELS: Record<string, string> = {
  Sale: "Venta",
  Lot: "Lote",
  Person: "Persona",
  Development: "Desarrollo",
  CashMovement: "Mov. Caja",
  User: "Usuario",
  Installment: "Cuota",
  ExtraCharge: "Refuerzo",
  SigningSlot: "Firma",
  ExchangeRate: "Cotizacion",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Creacion",
  UPDATE: "Actualizacion",
  DELETE: "Eliminacion",
};

function formatDateTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd/MM/yyyy HH:mm", { locale: es });
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function formatDetails(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

interface Props {
  logs: AuditRow[];
}

export function AuditTable({ logs }: Props) {
  const columns: Column<AuditRow>[] = [
    {
      key: "createdAt",
      label: "Fecha",
      render: (item) => (
        <span className="whitespace-nowrap text-sm">
          {formatDateTime(item.createdAt)}
        </span>
      ),
    },
    {
      key: "user",
      label: "Usuario",
      render: (item) => (
        <span className="font-medium">
          {item.user.name} {item.user.lastName}
        </span>
      ),
    },
    {
      key: "entity",
      label: "Entidad",
      render: (item) => (
        <span className="text-sm">
          {ENTITY_LABELS[item.entity] ?? item.entity}
        </span>
      ),
    },
    {
      key: "entityId",
      label: "ID Entidad",
      render: (item) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help font-mono text-xs text-muted-foreground">
                {truncate(item.entityId, 12)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">{item.entityId}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      key: "action",
      label: "Accion",
      render: (item) => (
        <span className="text-sm font-medium">
          {ACTION_LABELS[item.action] ?? item.action}
        </span>
      ),
    },
    {
      key: "details",
      label: "Detalles",
      render: (item) => {
        const details = formatDetails(item.newData || item.oldData);
        if (!details) {
          return <span className="text-muted-foreground">&mdash;</span>;
        }
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help text-xs text-muted-foreground">
                  {truncate(details, 40)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-md">
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-xs">
                  {details}
                </pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={logs}
      emptyTitle="Sin registros"
      emptyDescription="No se encontraron registros de auditoria."
    />
  );
}
