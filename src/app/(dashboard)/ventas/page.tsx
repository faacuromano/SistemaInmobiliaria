import { requirePermission } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/rbac";
import { getSales } from "@/server/actions/sale.actions";
import { getDevelopments } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { SalesFilters } from "./_components/sales-filters";
import { SalesTable } from "./_components/sales-table";
import { Button } from "@/components/ui/button";
import { Plus, HandCoins } from "lucide-react";
import Link from "next/link";
import type { SaleStatus } from "@/generated/prisma/client/client";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    developmentId?: string;
  }>;
}

export default async function SalesPage({ searchParams }: Props) {
  const session = await requirePermission("sales:view");
  const params = await searchParams;

  const [sales, developments] = await Promise.all([
    getSales({
      search: params.search,
      status: params.status as SaleStatus | undefined,
      developmentId: params.developmentId,
    }),
    getDevelopments(),
  ]);

  const canManage = hasPermission(session.user.role, "sales:manage");

  // Serialize all Decimal fields (sale + nested lot) for client components
  const serializedSales = sales.map((sale) => ({
    ...sale,
    totalPrice: Number(sale.totalPrice),
    downPayment: sale.downPayment != null ? Number(sale.downPayment) : null,
    firstInstallmentAmount: sale.firstInstallmentAmount != null ? Number(sale.firstInstallmentAmount) : null,
    regularInstallmentAmount: sale.regularInstallmentAmount != null ? Number(sale.regularInstallmentAmount) : null,
    commissionAmount: sale.commissionAmount != null ? Number(sale.commissionAmount) : null,
    lot: {
      ...sale.lot,
      area: sale.lot.area != null ? Number(sale.lot.area) : null,
      listPrice: sale.lot.listPrice != null ? Number(sale.lot.listPrice) : null,
    },
  }));

  // Extract minimal development data for filter dropdown
  const developmentOptions = developments.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader title="Ventas" description="Gestión de ventas" icon={HandCoins} accentColor="border-amber-600">
        {canManage && (
          <Button asChild>
            <Link href="/ventas/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Venta
            </Link>
          </Button>
        )}
      </PageHeader>
      <div className="grid grid-cols-4 gap-5">
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Ventas</p>
          <p className="text-2xl font-bold">{sales.length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Activas</p>
          <p className="text-2xl font-bold">{sales.filter(s => s.status === 'ACTIVA').length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Completadas</p>
          <p className="text-2xl font-bold">{sales.filter(s => s.status === 'COMPLETADA').length}</p>
        </div>
        <div className="rounded-md border bg-card p-3 shadow-sm">
          <p className="text-sm text-muted-foreground">Contado</p>
          <p className="text-2xl font-bold">{sales.filter(s => s.status === 'CONTADO').length}</p>
        </div>
      </div>
      <SalesFilters developments={developmentOptions} />
      <SalesTable sales={serializedSales} canManage={canManage} />
    </div>
  );
}
