import { requirePermission } from "@/lib/auth-guard";
import { hasPermission } from "@/lib/rbac";
import { searchPersonsForCollection } from "@/server/actions/person.actions";
import { Banknote } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { CobranzaSearch } from "./_components/cobranza-search";
import { CobranzaResults } from "./_components/cobranza-results";

interface Props {
  searchParams: Promise<{
    search?: string;
  }>;
}

export default async function CobranzaPage({ searchParams }: Props) {
  const session = await requirePermission("cash:view");
  const params = await searchParams;
  const canManage = hasPermission(session.user.role, "cash:manage");

  const search = params.search?.trim() ?? "";
  const results = search
    ? await searchPersonsForCollection(search)
    : [];

  // Compute effective status: PENDIENTE past due date → VENCIDA
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function effectiveStatus(status: string, dueDate: Date): string {
    if ((status === "PENDIENTE" || status === "PARCIAL") && new Date(dueDate) < today) {
      return "VENCIDA";
    }
    return status;
  }

  // Serialize Decimal fields for client components
  const serialized = results.map((person) => ({
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName,
    dni: person.dni,
    cuit: person.cuit,
    phone: person.phone,
    sales: person.sales.map((sale) => ({
      id: sale.id,
      totalPrice: Number(sale.totalPrice),
      currency: sale.currency,
      totalInstallments: sale.totalInstallments,
      status: sale.status,
      lot: {
        lotNumber: sale.lot.lotNumber,
        block: sale.lot.block,
        developmentName: sale.lot.development.name,
      },
      installments: sale.installments.map((inst) => ({
        id: inst.id,
        installmentNumber: inst.installmentNumber,
        amount: Number(inst.amount),
        paidAmount: Number(inst.paidAmount),
        currency: inst.currency,
        dueDate: inst.dueDate,
        monthLabel: inst.monthLabel,
        status: effectiveStatus(inst.status, inst.dueDate),
      })),
      extraCharges: sale.extraCharges.map((ec) => ({
        id: ec.id,
        description: ec.description,
        amount: Number(ec.amount),
        paidAmount: Number(ec.paidAmount),
        currency: ec.currency,
        dueDate: ec.dueDate,
        status: effectiveStatus(ec.status, ec.dueDate),
      })),
    })),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cobranza"
        description="Buscar persona y registrar pagos de cuotas"
        icon={Banknote}
        accentColor="border-emerald-600"
      />
      <CobranzaSearch defaultSearch={search} />
      <CobranzaResults
        results={serialized}
        search={search}
        canManage={canManage}
      />
    </div>
  );
}
