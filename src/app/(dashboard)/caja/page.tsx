import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import {
  getCashMovements,
  getCashMovementsSummary,
} from "@/server/actions/cash-movement.actions";
import { getCashBalances } from "@/server/actions/cash-balance.actions";
import { getTodayExchangeRate } from "@/server/actions/exchange-rate.actions";
import { getDevelopmentOptions } from "@/server/actions/development.actions";
import { getActiveBankAccounts } from "@/server/actions/bank-account.actions";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CajaFilters } from "./_components/caja-filters";
import { MovementsTable } from "./_components/movements-table";
import { BalanceLedger } from "./_components/balance-ledger";
import { CajaActions } from "./_components/caja-actions";
import { CajaTabs } from "./_components/caja-tabs";
import { BalanceSection } from "./_components/balance-section";
import { SummaryCards } from "./_components/summary-cards";
import type { MovementType } from "@/types/enums";

interface Props {
  searchParams: Promise<{
    search?: string;
    type?: string;
    developmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    paymentMethod?: string;
    bankAccountId?: string;
  }>;
}

export default async function CajaPage({ searchParams }: Props) {
  const session = await requirePermission("cash:view");
  const params = await searchParams;

  const currentYear = new Date().getFullYear();

  const [movements, summary, exchangeRate, developmentOptions, bankAccounts, initialBalances] =
    await Promise.all([
      getCashMovements({
        search: params.search,
        type: params.type as MovementType | undefined,
        developmentId: params.developmentId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        paymentMethod: params.paymentMethod,
        bankAccountId: params.bankAccountId,
      }),
      getCashMovementsSummary({
        developmentId: params.developmentId,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        paymentMethod: params.paymentMethod,
        bankAccountId: params.bankAccountId,
      }),
      getTodayExchangeRate(),
      getDevelopmentOptions(),
      getActiveBankAccounts(),
      getCashBalances({ year: currentYear }),
    ]);

  const canManage = await checkPermissionDb(session.user.role as Role, "cash:manage");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Caja"
        description="Movimientos de caja y resumen financiero"
        icon={Wallet}
        accentColor="border-violet-600"
      >
        {canManage && <CajaActions developments={developmentOptions} />}
      </PageHeader>

      <CajaFilters developments={developmentOptions} bankAccounts={bankAccounts} />

      <CajaTabs
        libroContent={
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          <BalanceLedger movements={movements as any} />
        }
        movimientosContent={
          <div className="space-y-6">
            <SummaryCards summary={summary} exchangeRate={exchangeRate} />
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
