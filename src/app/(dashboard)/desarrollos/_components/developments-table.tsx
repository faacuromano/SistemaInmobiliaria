"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { deleteDevelopment } from "@/server/actions/development.actions";
import {
  DEVELOPMENT_STATUS_LABELS,
  DEVELOPMENT_TYPE_LABELS,
  DEVELOPMENT_STATUS_COLORS,
} from "@/lib/constants";
import type { DevelopmentStatus, DevelopmentType } from "@/types/enums";

// Type for the development data returned from getDevelopments (with _count + sold lots)
type DevelopmentRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  type: DevelopmentType;
  status: DevelopmentStatus;
  _count: { lots: number };
  lots: { id: string }[]; // lots with sales
};

interface Props {
  developments: DevelopmentRow[];
  canManage: boolean;
}

export function DevelopmentsTable({ developments, canManage }: Props) {
  const router = useRouter();

  async function handleDelete(id: string) {
    const result = await deleteDevelopment(id);
    if (result.success) {
      toast.success("Desarrollo eliminado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns: Column<DevelopmentRow>[] = [
    {
      key: "name",
      label: "Nombre",
      render: (dev) => (
        <Link href={`/desarrollos/${dev.slug}`} className="font-medium hover:underline">
          {dev.name}
        </Link>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (dev) => (
        <StatusBadge
          label={DEVELOPMENT_TYPE_LABELS[dev.type]}
          variant="secondary"
        />
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (dev) => (
        <StatusBadge
          label={DEVELOPMENT_STATUS_LABELS[dev.status]}
          variant={DEVELOPMENT_STATUS_COLORS[dev.status]}
        />
      ),
    },
    {
      key: "location",
      label: "Ubicación",
      render: (dev) => dev.location ?? "---",
    },
    {
      key: "lots",
      label: "Lotes",
      render: (dev) => dev._count.lots,
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-12",
      render: (dev) => {
        const soldCount = dev.lots.length;
        const canDelete = soldCount === 0;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/desarrollos/${dev.slug}/editar`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              {canDelete ? (
                <ConfirmDialog
                  title="Eliminar desarrollo"
                  description={
                    dev._count.lots > 0
                      ? `¿Estás seguro de eliminar "${dev.name}" y sus ${dev._count.lots} lote(s)? Esta acción no se puede deshacer.`
                      : `¿Estás seguro de eliminar "${dev.name}"? Esta acción no se puede deshacer.`
                  }
                  onConfirm={() => handleDelete(dev.id)}
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  }
                />
              ) : (
                <DropdownMenuItem disabled>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar ({soldCount} lote(s) vendido(s))
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return (
    <DataTable
      columns={columns}
      data={developments}
      emptyTitle="Sin desarrollos"
      emptyDescription="No se encontraron desarrollos. Creá uno nuevo para empezar."
    />
  );
}
