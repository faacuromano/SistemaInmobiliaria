import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { getSaleById } from "@/server/actions/sale.actions";
import { getCashMovementsBySale } from "@/server/actions/cash-movement.actions";
import { getPaymentReceipts } from "@/server/actions/payment-receipt.actions";
import { getDevelopmentOptions } from "@/server/actions/development.actions";
import { getActiveSellers } from "@/server/actions/user.actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HandCoins } from "lucide-react";
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
} from "@/lib/constants";
import type { SaleStatus } from "@/types/enums";
import { SaleInfoCards } from "./_components/sale-info-cards";
import { InstallmentsTable } from "./_components/installments-table";
import { SaleActions } from "./_components/sale-actions";
import { SaleMovements } from "./_components/sale-movements";
import { ReceiptsSection } from "./_components/receipts-section";
import { SalePrintButton } from "./_components/sale-print-button";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SaleDetailPage({ params }: Props) {
  const session = await requirePermission("sales:view");
  const { id } = await params;

  const [sale, movements, receipts, developments, sellersRaw] = await Promise.all([
    getSaleById(id),
    getCashMovementsBySale(id),
    getPaymentReceipts({ saleId: id }),
    getDevelopmentOptions(),
    getActiveSellers(),
  ]);

  if (!sale) notFound();

  const canManage = await checkPermissionDb(session.user.role as Role, "sales:manage");

  const sellers = sellersRaw.map((s) => ({
    id: s.id,
    name: `${s.name} ${s.lastName}`,
  }));

  const EXEMPT_STATUSES = ["CONTADO", "CESION"];
  const isExempt = EXEMPT_STATUSES.includes(sale.status);
  const signingGateActive =
    !isExempt &&
    sale.signingSlots &&
    sale.signingSlots.length > 0 &&
    !sale.signingSlots.some(
      (s: { status: string }) => s.status === "COMPLETADA"
    );

  const lotLabel = sale.lot.block
    ? `Lote ${sale.lot.lotNumber} - Mz ${sale.lot.block}`
    : `Lote ${sale.lot.lotNumber}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Venta - ${lotLabel}`}
        description={sale.lot.development.name}
        icon={HandCoins}
        accentColor="border-amber-600"
      >
        <div className="flex items-center gap-2">
          <StatusBadge
            label={SALE_STATUS_LABELS[sale.status as SaleStatus]}
            variant={SALE_STATUS_COLORS[sale.status as SaleStatus]}
          />
          <SalePrintButton saleId={sale.id} />
          <Button asChild variant="outline" size="sm">
            <Link href="/ventas">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>
      </PageHeader>

      <SaleInfoCards sale={sale} developments={developments} sellers={sellers} />

      <InstallmentsTable
        installments={sale.installments}
        extraCharges={sale.extraCharges}
        canManage={canManage}
        saleId={sale.id}
        signingGateActive={!!signingGateActive}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SaleMovements movements={movements as any} />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ReceiptsSection receipts={receipts as any} canManage={canManage} />

      {canManage && (
        <SaleActions saleId={sale.id} saleStatus={sale.status} />
      )}
    </div>
  );
}
