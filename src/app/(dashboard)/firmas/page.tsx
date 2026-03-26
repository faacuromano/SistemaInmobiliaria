import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { getSignings, getSigningsByWeek } from "@/server/actions/signing.actions";
import { getBusinessHours } from "@/server/actions/business-hours.actions";
import { getDevelopmentOptions } from "@/server/actions/development.actions";
import { getActiveSellers } from "@/server/actions/user.actions";
import { FileSignature } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SigningsActions } from "./_components/signings-actions";
import { SigningsView } from "./_components/signings-view";

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    developmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    week?: string;
    // Auto-create from sale detail page
    newSigning?: string;
    saleId?: string;
    clientName?: string;
    lotInfo?: string;
    lotNumbers?: string;
    sellerId?: string;
  }>;
}

/**
 * Get the Monday of the week containing the given date.
 */
function getMonday(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function FirmasPage({ searchParams }: Props) {
  const session = await requirePermission("signings:view");
  const params = await searchParams;

  // Determine the week start (Monday) for calendar view
  const weekStart = params.week || getMonday(new Date());

  const [signings, weekSignings, developments, sellers, businessHours] = await Promise.all([
    // Fetch filtered signings for list view
    getSignings({
      search: params.search,
      status: params.status,
      developmentId: params.developmentId,
      dateFrom: params.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params.dateTo ? new Date(params.dateTo) : undefined,
    }),
    // Fetch week signings for calendar view
    getSigningsByWeek(weekStart),
    getDevelopmentOptions(),
    getActiveSellers(),
    getBusinessHours(),
  ]);

  const canManage = await checkPermissionDb(session.user.role as Role, "signings:manage");

  const developmentOptions = developments;

  const sellerOptions = sellers.map((s) => ({
    id: s.id,
    name: `${s.name} ${s.lastName}`.trim(),
  }));

  return (
    <div className="space-y-5">
      <PageHeader title="Firmas" description="Agenda de escrituraciones" icon={FileSignature} accentColor="border-rose-600">
        {canManage && (
          <SigningsActions
            developments={developmentOptions}
            sellers={sellerOptions}
          />
        )}
      </PageHeader>
      <SigningsView
        signings={signings}
        weekSignings={weekSignings}
        canManage={canManage}
        developments={developmentOptions}
        sellers={sellerOptions}
        initialWeekStart={weekStart}
        businessHours={businessHours}
        saleContext={
          params.newSigning === "1" && params.saleId
            ? {
                saleId: params.saleId,
                clientName: params.clientName ?? "",
                lotInfo: params.lotInfo ?? "",
                lotNumbers: params.lotNumbers ?? "",
                developmentId: params.developmentId ?? "",
                sellerId: params.sellerId ?? "",
              }
            : undefined
        }
      />
    </div>
  );
}
