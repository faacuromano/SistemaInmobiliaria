import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { getSales } from "@/server/actions/sale.actions";
import { getDevelopmentOptions } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { SalesFilters } from "./_components/sales-filters";
import { SalesTable } from "./_components/sales-table";
import { Button } from "@/components/ui/button";
import { Plus, HandCoins, TrendingUp, CheckCircle2, DollarSign, XCircle } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
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
    getDevelopmentOptions(),
  ]);

  const canManage = await checkPermissionDb(session.user.role as Role, "sales:manage");

  // Serialize all Decimal fields (sale + nested lot) for client components
  const serializedSales = sales.map((sale) => ({
    ...sale,
    totalPrice: Number(sale.totalPrice),
    downPayment: sale.downPayment != null ? Number(sale.downPayment) : null,
    firstInstallmentAmount: sale.firstInstallmentAmount != null ? Number(sale.firstInstallmentAmount) : null,
    regularInstallmentAmount: sale.regularInstallmentAmount != null ? Number(sale.regularInstallmentAmount) : null,
    commissionAmount: sale.commissionAmount != null ? Number(sale.commissionAmount) : null,
    exchangeRateOverride: sale.exchangeRateOverride != null ? Number(sale.exchangeRateOverride) : null,
    lot: {
      ...sale.lot,
      area: sale.lot.area != null ? Number(sale.lot.area) : null,
      listPrice: sale.lot.listPrice != null ? Number(sale.lot.listPrice) : null,
    },
  }));

  const developmentOptions = developments;

  return (
    <div className="space-y-5">
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
      {(() => {
        const activeSales = serializedSales.filter(s => s.status === "ACTIVA");
        const completedSales = serializedSales.filter(s => s.status === "COMPLETADA");
        const contadoSales = serializedSales.filter(s => s.status === "CONTADO");
        const cancelledSales = serializedSales.filter(s => s.status === "CANCELADA");
        const totalUsd = serializedSales.filter(s => s.currency === "USD" && s.status !== "CANCELADA").reduce((sum, s) => sum + s.totalPrice, 0);
        const totalArs = serializedSales.filter(s => s.currency === "ARS" && s.status !== "CANCELADA").reduce((sum, s) => sum + s.totalPrice, 0);

        return (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                Activas
              </div>
              <p className="mt-1 text-3xl font-bold tracking-tight">{activeSales.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Completadas
              </div>
              <p className="mt-1 text-3xl font-bold tracking-tight">{completedSales.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-violet-600" />
                Contado
              </div>
              <p className="mt-1 text-3xl font-bold tracking-tight">{contadoSales.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <XCircle className="h-3.5 w-3.5 text-red-600" />
                Canceladas
              </div>
              <p className="mt-1 text-3xl font-bold tracking-tight">{cancelledSales.length}</p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Facturado Total
              </div>
              <p className="mt-1 text-2xl font-bold tracking-tight">
                {totalUsd > 0 ? formatCurrency(totalUsd, "USD") : ""}
              </p>
              {totalArs > 0 && (
                <p className="text-[12px] text-muted-foreground">
                  + {formatCurrency(totalArs, "ARS")}
                </p>
              )}
            </div>
          </div>
        );
      })()}
      <SalesFilters developments={developmentOptions} />
      <SalesTable sales={serializedSales} canManage={canManage} />
    </div>
  );
}
