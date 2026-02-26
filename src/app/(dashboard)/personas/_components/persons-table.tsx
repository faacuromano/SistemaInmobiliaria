"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, UserCheck, UserX } from "lucide-react";
import { togglePersonActive } from "@/server/actions/person.actions";
import { PERSON_TYPE_LABELS, PERSON_TYPE_COLORS } from "@/lib/constants";
import type { PersonType } from "@/types/enums";

type PersonRow = {
  id: string;
  firstName: string;
  lastName: string;
  type: PersonType;
  dni: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  _count: { sales: number };
};

interface Props {
  persons: PersonRow[];
  canManage: boolean;
}

export function PersonsTable({ persons, canManage }: Props) {
  const router = useRouter();

  async function handleToggleActive(id: string) {
    const result = await togglePersonActive(id);
    if (result.success) {
      toast.success("Estado actualizado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns: Column<PersonRow>[] = [
    {
      key: "name",
      label: "Nombre",
      render: (person) => (
        <div className="flex items-center gap-2">
          <Link href={`/personas/${person.id}`} className="font-medium hover:underline">
            {person.lastName}, {person.firstName}
          </Link>
          {!person.isActive && (
            <Badge variant="outline" className="text-xs">Inactivo</Badge>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (person) => (
        <StatusBadge
          label={PERSON_TYPE_LABELS[person.type]}
          variant={PERSON_TYPE_COLORS[person.type]}
        />
      ),
    },
    {
      key: "dni",
      label: "DNI",
      render: (person) => person.dni ?? "—",
    },
    {
      key: "email",
      label: "Email",
      render: (person) => person.email ?? "—",
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (person) => person.phone ?? "—",
    },
    {
      key: "sales",
      label: "Ventas",
      render: (person) => person._count.sales,
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-12",
      render: (person) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/personas/${person.id}/editar`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleActive(person.id)}>
              {person.isActive ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activar
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return (
    <DataTable
      columns={columns}
      data={persons}
      emptyTitle="Sin personas"
      emptyDescription="No se encontraron personas registradas."
    />
  );
}
