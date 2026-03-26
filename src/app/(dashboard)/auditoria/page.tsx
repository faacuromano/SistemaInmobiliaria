import { requirePermission } from "@/lib/auth-guard";
import { getAuditLogs } from "@/server/actions/audit-log.actions";
import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { AuditFilters } from "./_components/audit-filters";
import { AuditTable } from "./_components/audit-table";

interface Props {
  searchParams: Promise<{
    search?: string;
    entity?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function AuditoriaPage({ searchParams }: Props) {
  await requirePermission("config:manage");
  const params = await searchParams;

  const logs = await getAuditLogs({
    search: params.search,
    entity: params.entity,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registros"
        description="Registro de actividad y operaciones del sistema"
        icon={ClipboardList}
        accentColor="border-orange-600"
      />
      <AuditFilters />
      <AuditTable logs={logs} />
    </div>
  );
}
