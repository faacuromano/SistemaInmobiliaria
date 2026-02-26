import { requirePermission } from "@/lib/auth-guard";
import { getDevelopments } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentsFilters } from "./_components/developments-filters";
import { DevelopmentsTable } from "./_components/developments-table";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import Link from "next/link";
import { hasPermission } from "@/lib/rbac";
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

  const canManage = hasPermission(session.user.role, "developments:manage");

  return (
    <div className="space-y-4">
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
      <div className="grid grid-cols-3 gap-5">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Desarrollos</p>
          <p className="text-2xl font-bold">{developments.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Activos</p>
          <p className="text-2xl font-bold">{developments.filter(d => d.status === DevelopmentStatus.EN_CURSO || d.status === DevelopmentStatus.PLANIFICACION).length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Completados</p>
          <p className="text-2xl font-bold">{developments.filter(d => d.status === DevelopmentStatus.FINALIZADO).length}</p>
        </div>
      </div>
      <DevelopmentsFilters />
      <DevelopmentsTable developments={developments} canManage={canManage} />
    </div>
  );
}
