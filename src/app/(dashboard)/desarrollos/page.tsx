import { requirePermission } from "@/lib/auth-guard";
import { getDevelopments } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentsFilters } from "./_components/developments-filters";
import { DevelopmentsTable } from "./_components/developments-table";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import Link from "next/link";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { DevelopmentStatus, DevelopmentType } from "@/generated/prisma/client/client";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    type?: string;
  }>;
}

export default async function DevelopmentsPage({ searchParams }: Props) {
  const session = await requirePermission("developments:view");
  const params = await searchParams;

  const developments = await getDevelopments({
    search: params.search,
    status: params.status as DevelopmentStatus | undefined,
    type: params.type as DevelopmentType | undefined,
  });

  const canManage = await checkPermissionDb(session.user.role as Role, "developments:manage");

  return (
    <div className="space-y-5">
      <PageHeader title="Desarrollos" description="Gestión de desarrollos inmobiliarios" icon={Building2} accentColor="border-blue-600">
        {canManage && (
          <Button asChild>
            <Link href="/desarrollos/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Desarrollo
            </Link>
          </Button>
        )}
      </PageHeader>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Total Desarrollos</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{developments.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Activos</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{developments.filter(d => d.status === DevelopmentStatus.EN_CURSO || d.status === DevelopmentStatus.PLANIFICACION).length}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-[13px] font-medium text-muted-foreground">Completados</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{developments.filter(d => d.status === DevelopmentStatus.FINALIZADO).length}</p>
        </div>
      </div>
      <DevelopmentsFilters />
      <DevelopmentsTable developments={developments} canManage={canManage} />
    </div>
  );
}
