import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MapPin,
  CalendarClock,
  FileSignature,
  ArrowRight,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_COLORS,
} from "@/lib/constants";
import type { SaleStatus, SigningStatus } from "@/types/enums";
import { IncomeChart } from "./_components/income-chart";
import { SalesStatusChart } from "./_components/sales-status-chart";
import { Sparkline } from "./_components/sparkline";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default async function DashboardPage() {
  const session = await requireAuth();

  const role = session.user.role as string;
  if (role !== "SUPER_ADMIN" && role !== "ADMINISTRACION") {
    redirect("/ventas");
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const today = new Date(currentYear, currentMonth, now.getDate());
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);

  // ── All queries in parallel ──────────────────────────────
  const [
    activeSalesCount,
    overdueCount,
    monthlyIncome,
    availableLotsCount,
    totalLotsCount,
    recentSales,
    overdueInstallments,
    upcomingSignings,
    urgentSigningsCount,
    upcomingExtraCharges,
    urgentExtraChargesCount,
    monthlyMovementsRaw,
    salesByStatus,
    monthlySalesRaw,
    monthlyOverdueRaw,
  ] = await Promise.all([
    prisma.sale.count({ where: { status: "ACTIVA" } }),
    prisma.installment.count({
      where: { status: "PENDIENTE", dueDate: { lt: today } },
    }),
    prisma.cashMovement.aggregate({
      where: { date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { usdIncome: true, arsIncome: true },
    }),
    prisma.lot.count({ where: { status: "DISPONIBLE" } }),
    prisma.lot.count(),
    prisma.sale.findMany({
      take: 5,
      orderBy: { saleDate: "desc" },
      select: {
        id: true, saleDate: true, totalPrice: true, currency: true,
        status: true,
        lot: { select: { lotNumber: true, development: { select: { name: true } } } },
        person: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.installment.findMany({
      where: { status: "PENDIENTE", dueDate: { lt: today } },
      take: 8,
      orderBy: { dueDate: "asc" },
      select: {
        id: true, installmentNumber: true, amount: true, currency: true,
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
    prisma.signingSlot.findMany({
      where: { date: { gte: today }, status: { notIn: ["CANCELADA", "COMPLETADA"] } },
      take: 5,
      orderBy: { date: "asc" },
      select: {
        id: true, date: true, time: true, lotInfo: true, clientName: true,
        status: true, development: { select: { name: true } },
      },
    }),
    prisma.signingSlot.count({
      where: {
        date: { gte: today, lte: threeDaysFromNow },
        status: { notIn: ["CANCELADA", "COMPLETADA"] },
      },
    }),
    prisma.extraCharge.findMany({
      where: { status: "PENDIENTE", dueDate: { gte: today, lte: thirtyDaysFromNow } },
      take: 5,
      orderBy: { dueDate: "asc" },
      select: {
        id: true, description: true, amount: true, currency: true,
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
    prisma.extraCharge.count({
      where: { status: "PENDIENTE", dueDate: { gte: today, lte: sevenDaysFromNow } },
    }),

    // ── Chart data: income+expense grouped by date ─────────
    prisma.cashMovement.groupBy({
      by: ["date"],
      where: { date: { gte: sixMonthsAgo } },
      _sum: { usdIncome: true, arsIncome: true, usdExpense: true, arsExpense: true },
    }),
    // ── Donut: sales by status ──────────────────────────────
    prisma.sale.groupBy({ by: ["status"], _count: true }),
    // ── Sparkline: monthly sales count ──────────────────────
    prisma.sale.groupBy({
      by: ["saleDate"],
      where: { saleDate: { gte: sixMonthsAgo } },
      _count: true,
    }),
    // ── Sparkline: monthly overdue at each point ────────────
    prisma.installment.groupBy({
      by: ["dueDate"],
      where: { status: "PENDIENTE", dueDate: { gte: sixMonthsAgo, lt: today } },
      _count: true,
    }),
  ]);

  const totalUsdIncome = Number(monthlyIncome._sum.usdIncome ?? 0);
  const totalArsIncome = Number(monthlyIncome._sum.arsIncome ?? 0);

  // ── Build chart data ──────────────────────────────────────
  // Initialize 6-month buckets
  function buildMonthMap() {
    const map = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - i, 1);
      map.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    return map;
  }

  const usdIncomeMap = buildMonthMap();
  const usdExpenseMap = buildMonthMap();
  const arsIncomeMap = buildMonthMap();
  const arsExpenseMap = buildMonthMap();
  const salesMap = buildMonthMap();
  const overdueMap = buildMonthMap();

  for (const row of monthlyMovementsRaw) {
    const d = new Date(row.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (usdIncomeMap.has(key)) {
      usdIncomeMap.set(key, (usdIncomeMap.get(key) ?? 0) + Number(row._sum.usdIncome ?? 0));
      usdExpenseMap.set(key, (usdExpenseMap.get(key) ?? 0) + Number(row._sum.usdExpense ?? 0));
      arsIncomeMap.set(key, (arsIncomeMap.get(key) ?? 0) + Number(row._sum.arsIncome ?? 0));
      arsExpenseMap.set(key, (arsExpenseMap.get(key) ?? 0) + Number(row._sum.arsExpense ?? 0));
    }
  }

  // Determine which currency has data
  const hasUsdData = [...usdIncomeMap.values(), ...usdExpenseMap.values()].some((v) => v > 0);
  const hasArsData = [...arsIncomeMap.values(), ...arsExpenseMap.values()].some((v) => v > 0);
  for (const row of monthlySalesRaw) {
    const d = new Date(row.saleDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (salesMap.has(key))
      salesMap.set(key, (salesMap.get(key) ?? 0) + row._count);
  }
  for (const row of monthlyOverdueRaw) {
    const d = new Date(row.dueDate);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (overdueMap.has(key))
      overdueMap.set(key, (overdueMap.get(key) ?? 0) + row._count);
  }

  // Use USD if there's USD data, otherwise fallback to ARS
  const chartCurrency = hasUsdData ? "USD" : hasArsData ? "ARS" : "USD";
  const incomeMapForChart = chartCurrency === "USD" ? usdIncomeMap : arsIncomeMap;
  const expenseMapForChart = chartCurrency === "USD" ? usdExpenseMap : arsExpenseMap;

  const incomeChartData = [...incomeMapForChart.keys()].map((key) => {
    const month = parseInt(key.split("-")[1]);
    return {
      month: MONTH_LABELS[month],
      ingresos: Math.round(incomeMapForChart.get(key) ?? 0),
      egresos: Math.round(expenseMapForChart.get(key) ?? 0),
    };
  });

  const salesSparkline = [...salesMap.values()];
  const overdueSparkline = [...overdueMap.values()];
  const incomeSparkline = [...incomeMapForChart.values()].map((v) => Math.round(v));

  // Donut chart
  const statusColors: Record<string, string> = {
    ACTIVA: "#3b82f6",
    COMPLETADA: "#10b981",
    CANCELADA: "#ef4444",
    CONTADO: "#8b5cf6",
    CESION: "#f59e0b",
  };
  const salesStatusData = salesByStatus.map((s) => ({
    name: SALE_STATUS_LABELS[s.status as SaleStatus] ?? s.status,
    value: s._count,
    color: statusColors[s.status] ?? "#94a3b8",
  }));
  const totalSales = salesByStatus.reduce((sum, s) => sum + s._count, 0);

  // Lot availability percentage
  const lotPct = totalLotsCount > 0 ? Math.round((availableLotsCount / totalLotsCount) * 100) : 0;

  function daysOverdue(dueDate: Date): number {
    return Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86_400_000));
  }
  function daysUntil(date: Date): number {
    return Math.max(0, Math.floor((new Date(date).getTime() - today.getTime()) / 86_400_000));
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Bienvenido, ${session.user.name}`}
        icon={LayoutDashboard}
        accentColor="border-primary"
      />

      {/* ════════════════════════════════════════════════════════
          SECTION 1 — KPI Cards (each with sparkline context)
          ════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Activas */}
        <div className="glass-tint-blue rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                </div>
                Ventas Activas
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">{activeSalesCount}</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Ultimos 6 meses</p>
            </div>
            <div className="w-24 shrink-0 opacity-80">
              <Sparkline data={salesSparkline} color="#3b82f6" />
            </div>
          </div>
        </div>

        {/* Ingresos del Mes */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                Ingresos del Mes
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {formatCurrency(totalUsdIncome, "USD")}
              </p>
              {totalArsIncome > 0 && (
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  + {formatCurrency(totalArsIncome, "ARS")}
                </p>
              )}
            </div>
            <div className="w-24 shrink-0 opacity-80">
              <Sparkline data={incomeSparkline} color="#10b981" />
            </div>
          </div>
        </div>

        {/* Cuotas Vencidas */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${overdueCount > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                  <AlertTriangle className={`h-3.5 w-3.5 ${overdueCount > 0 ? "text-red-600" : "text-emerald-600"}`} />
                </div>
                Cuotas Vencidas
              </div>
              <p className={`mt-2 text-3xl font-bold tracking-tight ${overdueCount > 0 ? "text-red-600" : ""}`}>
                {overdueCount}
              </p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {overdueCount > 0 ? "Requiere atencion" : "Todo al dia"}
              </p>
            </div>
            {overdueSparkline.some((v) => v > 0) && (
              <div className="w-24 shrink-0 opacity-80">
                <Sparkline data={overdueSparkline} color="#ef4444" />
              </div>
            )}
          </div>
        </div>

        {/* Lotes Disponibles */}
        <div className="glass rounded-2xl p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <MapPin className="h-3.5 w-3.5 text-amber-600" />
              </div>
              Lotes Disponibles
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">{availableLotsCount}</p>
            {/* Progress bar showing availability */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${lotPct}%` }}
                />
              </div>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {lotPct}% libres
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 2 — Charts (financial + distribution)
          ════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Income vs Expense — Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Movimientos {chartCurrency}
                </CardTitle>
                <p className="text-[13px] text-muted-foreground">
                  Ingresos vs egresos — ultimos 6 meses
                </p>
              </div>
              <Link
                href="/estadisticas"
                className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
              >
                Ver detalle <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <IncomeChart data={incomeChartData} currency={chartCurrency} />
          </CardContent>
        </Card>

        {/* Sales Distribution — Donut */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-base font-semibold">
                Ventas por Estado
              </CardTitle>
              <p className="text-[13px] text-muted-foreground">
                Distribucion actual
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <SalesStatusChart data={salesStatusData} total={totalSales} />
          </CardContent>
        </Card>
      </div>

      {/* ════════════════════════════════════════════════════════
          SECTION 3 — Alerts (overdue + extra charges + signings)
          ════════════════════════════════════════════════════════ */}
      {(overdueCount > 0 || upcomingExtraCharges.length > 0 || urgentSigningsCount > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Overdue Installments */}
          {overdueCount > 0 && (
            <Card className="border-red-200/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-100">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    </div>
                    Cuotas Vencidas
                    <span className="ml-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 tabular-nums">
                      {overdueCount}
                    </span>
                  </CardTitle>
                  <Link
                    href="/cobranza"
                    className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                  >
                    Ver cobranza <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {overdueInstallments.map((inst) => {
                    const days = daysOverdue(inst.dueDate);
                    return (
                      <Link
                        key={inst.id}
                        href={`/ventas/${inst.sale.id}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-red-50/60"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {inst.sale.lot.development.name} — Lote {inst.sale.lot.lotNumber}
                          </p>
                          <p className="truncate text-[12px] text-muted-foreground">
                            {inst.sale.person.firstName} {inst.sale.person.lastName} · Cuota #{inst.installmentNumber}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold tabular-nums">
                            {formatCurrency(Number(inst.amount), inst.currency as "USD" | "ARS")}
                          </p>
                          <p className="text-[12px] font-semibold text-red-600 tabular-nums">
                            {days}d atraso
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming signings + extra charges combined */}
          <div className="space-y-4">
            {/* Upcoming Signings */}
            {upcomingSignings.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-100">
                        <CalendarClock className="h-3.5 w-3.5 text-orange-600" />
                      </div>
                      Proximas Firmas
                      {urgentSigningsCount > 0 && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700 tabular-nums">
                          {urgentSigningsCount} urgente{urgentSigningsCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </CardTitle>
                    <Link
                      href="/firmas"
                      className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
                    >
                      Agenda <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingSignings.map((signing) => {
                      const days = daysUntil(signing.date);
                      const isUrgent = days <= 3;
                      return (
                        <div
                          key={signing.id}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                            isUrgent ? "bg-orange-50/60" : ""
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {signing.development?.name ? `${signing.development.name} — ` : ""}
                              {signing.lotInfo}
                            </p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {signing.clientName ?? "Sin cliente"} · {signing.time}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`text-[12px] font-semibold tabular-nums ${isUrgent ? "text-orange-600" : "text-muted-foreground"}`}>
                              {days === 0 ? "Hoy" : days === 1 ? "Manana" : `${days}d`}
                            </span>
                            <StatusBadge
                              label={SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
                              variant={SIGNING_STATUS_COLORS[signing.status as SigningStatus]}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Extra Charges */}
            {upcomingExtraCharges.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100">
                        <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      Refuerzos Proximos
                      {urgentExtraChargesCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 tabular-nums">
                          {urgentExtraChargesCount} en 7d
                        </span>
                      )}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingExtraCharges.map((charge) => {
                      const days = daysUntil(charge.dueDate);
                      const isUrgent = days <= 7;
                      return (
                        <Link
                          key={charge.id}
                          href={`/ventas/${charge.sale.id}`}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors hover:bg-amber-50/60 ${isUrgent ? "bg-amber-50/40" : ""}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{charge.description}</p>
                            <p className="truncate text-[12px] text-muted-foreground">
                              {charge.sale.person.firstName} {charge.sale.person.lastName} · {charge.sale.lot.development.name}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">
                              {formatCurrency(Number(charge.amount), charge.currency as "USD" | "ARS")}
                            </p>
                            <p className={`text-[12px] tabular-nums ${isUrgent ? "font-semibold text-amber-600" : "text-muted-foreground"}`}>
                              {days === 0 ? "Hoy" : days === 1 ? "Manana" : `en ${days}d`}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          SECTION 4 — Recent Activity
          ════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Ventas Recientes
              </CardTitle>
              <p className="text-[13px] text-muted-foreground">
                Ultimas operaciones registradas
              </p>
            </div>
            <Link
              href="/ventas"
              className="flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay ventas registradas.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wider">Lote</th>
                    <th className="pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wider">Comprador</th>
                    <th className="pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wider text-right">Precio</th>
                    <th className="pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wider">Estado</th>
                    <th className="pb-2.5 text-xs font-semibold uppercase tracking-wider text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b last:border-0 transition-colors hover:bg-accent/30"
                    >
                      <td className="py-3 pr-4">
                        <Link href={`/ventas/${sale.id}`} className="font-medium hover:underline">
                          {sale.lot.development.name} — Lote {sale.lot.lotNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {sale.person.firstName} {sale.person.lastName}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">
                        {formatCurrency(Number(sale.totalPrice), sale.currency as "USD" | "ARS")}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge
                          label={SALE_STATUS_LABELS[sale.status as SaleStatus]}
                          variant={SALE_STATUS_COLORS[sale.status as SaleStatus]}
                        />
                      </td>
                      <td className="py-3 text-right tabular-nums text-muted-foreground">
                        {formatDate(sale.saleDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
