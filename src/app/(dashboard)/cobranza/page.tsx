import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { searchPersonsForCollection } from "@/server/actions/person.actions";
import { getActiveBankAccounts } from "@/server/actions/bank-account.actions";
import { prisma } from "@/lib/prisma";
import { Banknote, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import Link from "next/link";
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
  const canManage = await checkPermissionDb(session.user.role as Role, "cash:manage");

  const search = params.search?.trim() ?? "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [results, bankAccounts, overdueCount, pendingThisMonth, collectedThisMonth, overdueInstallments] = await Promise.all([
    search ? searchPersonsForCollection(search) : Promise.resolve([]),
    getActiveBankAccounts(),
    prisma.installment.count({
      where: { status: "PENDIENTE", dueDate: { lt: today } },
    }),
    prisma.installment.count({
      where: { status: "PENDIENTE", dueDate: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.installment.count({
      where: { status: "PAGADA", paidDate: { gte: startOfMonth, lte: endOfMonth } },
    }),
    prisma.installment.findMany({
      where: {
        status: { in: ["PENDIENTE", "PARCIAL"] },
        dueDate: { lt: today },
      },
      take: 15,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        installmentNumber: true,
        amount: true,
        paidAmount: true,
        currency: true,
        dueDate: true,
        sale: {
          select: {
            id: true,
            lot: { select: { lotNumber: true, development: { select: { name: true } } } },
            person: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

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

  function daysOverdue(dueDate: Date): number {
    return Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86_400_000));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cobranza"
        description="Buscar persona y registrar pagos de cuotas"
        icon={Banknote}
        accentColor="border-emerald-600"
      />

      {/* ── Statistics ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <AlertTriangle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-red-600" : "text-emerald-600"}`} />
            Cuotas Vencidas
          </div>
          <p className={`mt-1 text-3xl font-bold tracking-tight ${overdueCount > 0 ? "text-red-600" : ""}`}>
            {overdueCount}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            Pendientes Este Mes
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{pendingThisMonth}</p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            Cobradas Este Mes
          </div>
          <p className="mt-1 text-3xl font-bold tracking-tight">{collectedThisMonth}</p>
        </div>
      </div>

      {/* ── Overdue Installments ────────────────────────────── */}
      {overdueInstallments.length > 0 && (
        <div className="rounded-xl border border-red-200/60 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Cuotas Vencidas
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 tabular-nums">
                {overdueCount}
              </span>
            </h3>
          </div>
          <div className="divide-y">
            {overdueInstallments.map((inst) => {
              const days = daysOverdue(inst.dueDate);
              const remaining = Math.round((Number(inst.amount) - Number(inst.paidAmount)) * 100) / 100;
              return (
                <Link
                  key={inst.id}
                  href={`/ventas/${inst.sale.id}`}
                  className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-red-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {inst.sale.lot.development.name} — Lote {inst.sale.lot.lotNumber}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                      {inst.sale.person.firstName} {inst.sale.person.lastName} · Cuota #{inst.installmentNumber} · Venc. {formatDate(inst.dueDate)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(remaining, inst.currency as "USD" | "ARS")}
                    </p>
                    <p className="text-[12px] font-semibold text-red-600 tabular-nums">
                      {days}d atraso
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <CobranzaSearch defaultSearch={search} />
      <CobranzaResults
        results={serialized}
        search={search}
        canManage={canManage}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
