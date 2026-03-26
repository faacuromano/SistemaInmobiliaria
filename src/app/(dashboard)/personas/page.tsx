import { requirePermission } from "@/lib/auth-guard";
import { getPersons } from "@/server/actions/person.actions";
import { PageHeader } from "@/components/shared/page-header";
import { PersonsFilters } from "./_components/persons-filters";
import { PersonsTable } from "./_components/persons-table";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import type { PersonType } from "@/generated/prisma/client/client";

interface Props {
  searchParams: Promise<{
    search?: string;
    type?: string;
    inactive?: string;
  }>;
}

export default async function PersonsPage({ searchParams }: Props) {
  const session = await requirePermission("persons:view");
  const params = await searchParams;

  const showInactive = params.inactive === "true";
  const persons = await getPersons({
    search: params.search,
    type: params.type as PersonType | undefined,
    isActive: showInactive ? undefined : true,
  });

  const canManage = await checkPermissionDb(session.user.role as Role, "persons:manage");

  return (
    <div className="space-y-5">
      <PageHeader title="Personas" description="Gestión de clientes y proveedores" icon={Users} accentColor="border-emerald-600">
        {canManage && (
          <Button asChild>
            <Link href="/personas/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Persona
            </Link>
          </Button>
        )}
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Total Personas</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{persons.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Clientes</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{persons.filter(p => p.type === 'CLIENTE' || p.type === 'AMBOS').length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Proveedores</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{persons.filter(p => p.type === 'PROVEEDOR' || p.type === 'AMBOS').length}</p>
        </div>
      </div>
      <PersonsFilters />
      <PersonsTable persons={persons} canManage={canManage} />
    </div>
  );
}
