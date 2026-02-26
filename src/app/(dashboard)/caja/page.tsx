import { requirePermission } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/rbac";
import {
  getCashMovements,
  getCashMovementsSummary,
} from "@/server/actions/cash-movement.actions";
import { getCashBalances } from "@/server/actions/cash-balance.actions";
import { getTodayExchangeRate } from "@/server/actions/exchange-rate.actions";
import { getDevelopments } from "@/server/actions/development.actions";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SummaryCards } from "./_components/summary-cards";
import { CajaFilters } from "./_components/caja-filters";
import { MovementsTable } from "./_components/movements-table";
import { CajaActions } from "./_components/caja-actions";
import { CajaTabs } from "./_components/caja-tabs";
import { BalanceSection } from "./_components/balance-section";
import type { MovementType } from "@/types/enums";

interface Props {
  searchParams: Promise<{
    search?: string;
    type?: string;
    developmentId?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function CajaPage({ searchParams }: Props) {
  const session = await requirePermission("cash:view");
  const params = await searchParams;

  const currentYear = new Date().getFullYear();

  const [movements, summary, exchangeRate, developments, initialBalances] =
    await Promise.all([
      getCashMovements({
        search: params.search,
        type: params.type as MovementType | undefined,
        developmentId: params.developmentId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }),
      getCashMovementsSummary({
        developmentId: params.developmentId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
      }),
      getTodayExchangeRate(),
      getDevelopments(),
      getCashBalances({ year: currentYear }),
    ]);

  const canManage = hasPermission(session.user.role, "cash:manage");

  // Extract minimal development data for filter dropdown and dialog
  const developmentOptions = developments.map((d) => ({
    id: d.id,
    name: d.name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Caja"
        description="Movimientos de caja y resumen financiero"
        icon={Wallet}
        accentColor="border-violet-600"
      >
        {canManage && <CajaActions developments={developmentOptions} />}
      </PageHeader>
      <CajaTabs
        movimientosContent={
          <div className="space-y-6">
            <SummaryCards summary={summary} exchangeRate={exchangeRate} />
            <CajaFilters developments={developmentOptions} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <MovementsTable movements={movements as any} />
          </div>
        }
        balancesContent={
          <BalanceSection
            developments={developmentOptions}
            canManage={canManage}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            initialBalances={initialBalances as any}
          />
        }
      />
    </div>
  );
}
