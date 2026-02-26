"use client";

import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import {
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_COLORS,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { SigningStatus } from "@/types/enums";
import { SigningFormDialog } from "./signing-form-dialog";
import { SigningStatusSelect } from "./signing-status-select";

type SigningRow = {
  id: string;
  date: Date;
  time: string;
  endTime: string | null;
  lotInfo: string;
  clientName: string | null;
  lotNumbers: string | null;
  status: string;
  notes: string | null;
  development: { name: string } | null;
  seller: { name: string; lastName: string } | null;
  developmentId: string | null;
  sellerId: string | null;
};

interface Props {
  signings: SigningRow[];
  canManage: boolean;
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
}

export function SigningsTable({ signings, canManage, developments, sellers }: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSigning, setSelectedSigning] = useState<SigningRow | null>(null);

  function handleEdit(signing: SigningRow) {
    setSelectedSigning(signing);
    setEditOpen(true);
  }

  const columns: Column<SigningRow>[] = [
    {
      key: "date",
      label: "Fecha",
      render: (item) => formatDate(item.date),
    },
    {
      key: "time",
      label: "Horario",
      render: (item) => (
        <span>
          {item.time}
          {item.endTime ? ` - ${item.endTime}` : ""}
        </span>
      ),
    },
    {
      key: "lotInfo",
      label: "Lote",
      render: (item) => <span className="font-medium">{item.lotInfo}</span>,
    },
    {
      key: "clientName",
      label: "Cliente",
      render: (item) => item.clientName || "\u2014",
    },
    {
      key: "development",
      label: "Desarrollo",
      render: (item) => item.development?.name || "\u2014",
    },
    {
      key: "seller",
      label: "Vendedor",
      render: (item) => item.seller ? `${item.seller.name} ${item.seller.lastName}`.trim() : "\u2014",
    },
    {
      key: "status",
      label: "Estado",
      render: (item) => (
        <StatusBadge
          label={SIGNING_STATUS_LABELS[item.status as SigningStatus]}
          variant={SIGNING_STATUS_COLORS[item.status as SigningStatus]}
        />
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-32",
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleEdit(item)}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <SigningStatusSelect
            signingId={item.id}
            currentStatus={item.status}
          />
        </div>
      ),
    });
  }

  const editDefaultValues = selectedSigning
    ? {
        id: selectedSigning.id,
        date: typeof selectedSigning.date === "string"
          ? selectedSigning.date
          : new Date(selectedSigning.date).toISOString().split("T")[0],
        time: selectedSigning.time,
        endTime: selectedSigning.endTime,
        lotInfo: selectedSigning.lotInfo,
        clientName: selectedSigning.clientName,
        lotNumbers: selectedSigning.lotNumbers,
        developmentId: selectedSigning.developmentId,
        sellerId: selectedSigning.sellerId,
        status: selectedSigning.status,
        notes: selectedSigning.notes,
      }
    : undefined;

  return (
    <>
      <DataTable
        columns={columns}
        data={signings}
        emptyTitle="Sin firmas"
        emptyDescription="No se encontraron turnos de firma. Crea uno nuevo para empezar."
      />
      {canManage && (
        <SigningFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          developments={developments}
          sellers={sellers}
          defaultValues={editDefaultValues}
        />
      )}
    </>
  );
}
