import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { PeriodFilters } from "./_components/period-filters";
import { MonthlyMovementsTable } from "./_components/monthly-movements-table";
import { CollectionHelpTooltip } from "./_components/collection-help-tooltip";
import { SALE_STATUS_LABELS } from "@/lib/constants";
import type { SaleStatus } from "@/types/enums";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ── Types ────────────────────────────────────────────────────────────
interface MonthlyRow {
  month: number;
  label: string;
  usdIncome: number;
  usdExpense: number;
  arsIncome: number;
  arsExpense: number;
  netUsd: number;
}

interface MovementByType {
  month: number;
  type: string;
  usdIncome: number;
  usdExpense: number;
  arsIncome: number;
  arsExpense: number;
}

interface SalesByStatus {
  status: string;
  count: number;
  avgPrice: number;
  totalPrice: number;
}

// ── Helpers ──────────────────────────────────────────────────────────
const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function ChangeIndicator({ current, previous }: { current: number; previous: number }) {
  const pct = pctChange(current, previous);
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const isPositive = pct > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-medium ${
        isPositive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
interface Props {
  searchParams: Promise<{
    year?: string;
    developmentId?: string;
  }>;
}

export default async function EstadisticasPage({ searchParams }: Props) {
  await requireAuth();
  const params = await searchParams;

  const currentYear = new Date().getFullYear();
  const selectedYear = params.year ? parseInt(params.year, 10) : currentYear;
  const developmentId = params.developmentId || undefined;

  const startOfYear = new Date(selectedYear, 0, 1);
  const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
  const startOfPrevYear = new Date(selectedYear - 1, 0, 1);
  const endOfPrevYear = new Date(selectedYear - 1, 11, 31, 23, 59, 59, 999);

  const today = new Date();

  // ── Build available years (from earliest movement to current year + 1) ──
  const earliestMovement = await prisma.cashMovement.findFirst({
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const earliestYear = earliestMovement
    ? new Date(earliestMovement.date).getFullYear()
    : currentYear;
  const availableYears: number[] = [];
  for (let y = currentYear + 1; y >= earliestYear; y--) {
    availableYears.push(y);
  }

  // ── Parallel queries ───────────────────────────────────────────────
  const developmentFilter = developmentId ? { developmentId } : {};

  const [
    movements,
    prevYearMovements,
    salesByStatus,
    prevYearSales,
    installmentsTotal,
    installmentsDueToDate,
    installmentsPaidToDate,
    installmentsOverdue,
    prevInstallmentsDue,
    prevInstallmentsPaid,
    partialInstallmentsDue,
    prevPartialInstallments,
    developments,
    totalPaidInYear,
  ] = await Promise.all([
    // Current year cash movements
    prisma.cashMovement.findMany({
      where: {
        date: { gte: startOfYear, lte: endOfYear },
        ...developmentFilter,
      },
      select: {
        date: true,
        type: true,
        usdIncome: true,
        usdExpense: true,
        arsIncome: true,
        arsExpense: true,
      },
    }),

    // Previous year cash movements (for YoY)
    prisma.cashMovement.findMany({
      where: {
        date: { gte: startOfPrevYear, lte: endOfPrevYear },
        ...developmentFilter,
      },
      select: {
        usdIncome: true,
        usdExpense: true,
        arsIncome: true,
        arsExpense: true,
      },
    }),

    // Sales grouped by status for selected year
    prisma.sale.groupBy({
      by: ["status"],
      where: {
        saleDate: { gte: startOfYear, lte: endOfYear },
        ...(developmentId
          ? { lot: { developmentId } }
          : {}),
      },
      _count: true,
      _avg: { totalPrice: true },
      _sum: { totalPrice: true },
    }),

    // Previous year sales for YoY
    prisma.sale.groupBy({
      by: ["status"],
      where: {
        saleDate: { gte: startOfPrevYear, lte: endOfPrevYear },
        ...(developmentId
          ? { lot: { developmentId } }
          : {}),
      },
      _count: true,
      _avg: { totalPrice: true },
      _sum: { totalPrice: true },
    }),

    // Total installments expected in the year (all months)
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfYear, lte: endOfYear },
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),

    // Installments due to date (dueDate <= today, within selected year)
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfYear, lte: endOfYear < today ? endOfYear : today },
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),

    // Installments paid to date (PAGADA, dueDate <= today, within selected year)
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfYear, lte: endOfYear < today ? endOfYear : today },
        status: "PAGADA",
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),

    // Overdue installments (past due, not paid)
    prisma.installment.findMany({
      where: {
        dueDate: { gte: startOfYear, lt: today },
        status: { in: ["PENDIENTE", "VENCIDA", "PARCIAL"] },
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
      select: {
        amount: true,
        paidAmount: true,
        currency: true,
      },
    }),

    // Previous year installments due to date (full year since it's past)
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfPrevYear, lte: endOfPrevYear },
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),

    // Previous year installments paid
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfPrevYear, lte: endOfPrevYear },
        status: "PAGADA",
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),

    // Partial installments due to date (PARCIAL status, with paidAmount for proportional credit)
    prisma.installment.findMany({
      where: {
        dueDate: { gte: startOfYear, lte: endOfYear < today ? endOfYear : today },
        status: "PARCIAL",
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
      select: {
        amount: true,
        paidAmount: true,
      },
    }),

    // Previous year partial installments (for YoY proportional credit)
    prisma.installment.findMany({
      where: {
        dueDate: { gte: startOfPrevYear, lte: endOfPrevYear },
        status: "PARCIAL",
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
      select: {
        amount: true,
        paidAmount: true,
      },
    }),

    // All developments for filter
    prisma.development.findMany({
      where: { status: { not: "FINALIZADO" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),

    // All PAGADA installments in the year (regardless of dueDate vs today)
    prisma.installment.count({
      where: {
        dueDate: { gte: startOfYear, lte: endOfYear },
        status: "PAGADA",
        ...(developmentId
          ? { sale: { lot: { developmentId } } }
          : {}),
      },
    }),
  ]);

  // Also get paid installments with paidDate for average days calculation
  const paidInstallmentsWithDates = await prisma.installment.findMany({
    where: {
      dueDate: { gte: startOfYear, lte: endOfYear },
      status: "PAGADA",
      paidDate: { not: null },
      ...(developmentId
        ? { sale: { lot: { developmentId } } }
        : {}),
    },
    select: {
      dueDate: true,
      paidDate: true,
    },
  });

  // ── Process monthly data ──────────────────────────────────────────
  const monthlyMap = new Map<number, MonthlyRow>();
  for (let m = 0; m < 12; m++) {
    monthlyMap.set(m, {
      month: m,
      label: MONTH_LABELS[m],
      usdIncome: 0,
      usdExpense: 0,
      arsIncome: 0,
      arsExpense: 0,
      netUsd: 0,
    });
  }

  for (const mov of movements) {
    const month = new Date(mov.date).getMonth();
    const row = monthlyMap.get(month)!;
    row.usdIncome += Number(mov.usdIncome ?? 0);
    row.usdExpense += Number(mov.usdExpense ?? 0);
    row.arsIncome += Number(mov.arsIncome ?? 0);
    row.arsExpense += Number(mov.arsExpense ?? 0);
  }

  const monthlyData: MonthlyRow[] = Array.from(monthlyMap.values()).map((row) => ({
    ...row,
    netUsd: row.usdIncome - row.usdExpense,
  }));

  // Build per-type-per-month data for the client component
  const movementsByType: MovementByType[] = [];
  const typeMonthMap = new Map<string, Map<number, MovementByType>>();

  for (const mov of movements) {
    const month = new Date(mov.date).getMonth();
    const type = mov.type;

    if (!typeMonthMap.has(type)) {
      typeMonthMap.set(type, new Map());
    }
    const monthMap = typeMonthMap.get(type)!;

    if (!monthMap.has(month)) {
      monthMap.set(month, {
        month,
        type,
        usdIncome: 0,
        usdExpense: 0,
        arsIncome: 0,
        arsExpense: 0,
      });
    }

    const entry = monthMap.get(month)!;
    entry.usdIncome += Number(mov.usdIncome ?? 0);
    entry.usdExpense += Number(mov.usdExpense ?? 0);
    entry.arsIncome += Number(mov.arsIncome ?? 0);
    entry.arsExpense += Number(mov.arsExpense ?? 0);
  }

  for (const [, monthMapInner] of typeMonthMap) {
    for (const [, entry] of monthMapInner) {
      movementsByType.push(entry);
    }
  }

  // ── Process sales summary ─────────────────────────────────────────
  const salesSummary: SalesByStatus[] = salesByStatus.map((s) => ({
    status: s.status,
    count: s._count,
    avgPrice: Number(s._avg.totalPrice ?? 0),
    totalPrice: Number(s._sum.totalPrice ?? 0),
  }));

  const totalSalesCount = salesSummary.reduce((acc, s) => acc + s.count, 0);
  const totalSalesValue = salesSummary.reduce((acc, s) => acc + s.totalPrice, 0);
  const avgSalePrice = totalSalesCount > 0 ? totalSalesValue / totalSalesCount : 0;

  // ── Collection performance ────────────────────────────────────────
  // Proportional credit from PARCIAL installments
  const partialCredit = partialInstallmentsDue.reduce((acc, inst) => {
    const amount = Number(inst.amount ?? 0);
    const paid = Number(inst.paidAmount ?? 0);
    return acc + (amount > 0 ? paid / amount : 0);
  }, 0);

  const collectionRate = installmentsDueToDate > 0
    ? ((installmentsPaidToDate + partialCredit) / installmentsDueToDate) * 100
    : 0;

  const overdueCount = installmentsOverdue.length;
  const overdueAmount = installmentsOverdue.reduce(
    (acc, inst) => acc + (Number(inst.amount ?? 0) - Number(inst.paidAmount ?? 0)),
    0
  );
  const installmentsPendingFuture = installmentsTotal - installmentsDueToDate;
  const paidInAdvance = totalPaidInYear - installmentsPaidToDate;

  // Average days to payment
  let avgDaysToPayment = 0;
  if (paidInstallmentsWithDates.length > 0) {
    const totalDays = paidInstallmentsWithDates.reduce((acc, inst) => {
      const due = new Date(inst.dueDate).getTime();
      const paid = new Date(inst.paidDate!).getTime();
      const diff = (paid - due) / (1000 * 60 * 60 * 24);
      return acc + diff;
    }, 0);
    avgDaysToPayment = totalDays / paidInstallmentsWithDates.length;
  }

  // ── Year-over-Year ────────────────────────────────────────────────
  const currentTotalUsdIncome = movements.reduce(
    (acc, m) => acc + Number(m.usdIncome ?? 0),
    0
  );
  const prevTotalUsdIncome = prevYearMovements.reduce(
    (acc, m) => acc + Number(m.usdIncome ?? 0),
    0
  );

  const prevTotalSalesCount = prevYearSales.reduce((acc, s) => acc + s._count, 0);
  const prevTotalSalesValue = prevYearSales.reduce(
    (acc, s) => acc + Number(s._sum.totalPrice ?? 0),
    0
  );
  const prevAvgSalePrice = prevTotalSalesCount > 0
    ? prevTotalSalesValue / prevTotalSalesCount
    : 0;

  const prevPartialCredit = prevPartialInstallments.reduce((acc, inst) => {
    const amount = Number(inst.amount ?? 0);
    const paid = Number(inst.paidAmount ?? 0);
    return acc + (amount > 0 ? paid / amount : 0);
  }, 0);

  const prevCollectionRate = prevInstallmentsDue > 0
    ? ((prevInstallmentsPaid + prevPartialCredit) / prevInstallmentsDue) * 100
    : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Estadisticas"
        description={`Metricas y analisis del periodo ${selectedYear}`}
        icon={BarChart3}
        accentColor="border-cyan-600"
      />

      {/* ── Section 1: Period Selector ─────────────────────────── */}
      <PeriodFilters
        developments={developments}
        availableYears={availableYears}
      />

      {/* ── Section 2: Monthly Income Table ────────────────────── */}
      <MonthlyMovementsTable
        monthlyData={monthlyData}
        movementsByType={movementsByType}
        selectedYear={selectedYear}
      />

      {/* ── Section 3 & 4: Sales Summary + Collection Performance ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Resumen de Ventas — {selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="rounded-md border bg-card p-3 shadow-sm">
                <p className="text-2xl font-bold">{totalSalesCount}</p>
                <p className="text-sm text-muted-foreground">Total Ventas</p>
              </div>
              <div className="rounded-md border bg-card p-3 shadow-sm">
                <p className="text-2xl font-bold">
                  {formatCurrency(totalSalesValue, "USD")}
                </p>
                <p className="text-sm text-muted-foreground">Valor Total</p>
              </div>
              <div className="col-span-2 rounded-md border bg-card p-3 shadow-sm">
                <p className="text-2xl font-bold">
                  {formatCurrency(avgSalePrice, "USD")}
                </p>
                <p className="text-sm text-muted-foreground">
                  Precio Promedio por Venta
                </p>
              </div>
            </div>

            {salesSummary.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Estado</th>
                      <th className="pb-2 pr-4 font-medium text-right">Cantidad</th>
                      <th className="pb-2 pr-4 font-medium text-right">Precio Prom.</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesSummary.map((s) => (
                      <tr key={s.status} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          {SALE_STATUS_LABELS[s.status as SaleStatus] ?? s.status}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {s.count}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatCurrency(s.avgPrice, "USD")}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {formatCurrency(s.totalPrice, "USD")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay ventas en el periodo seleccionado.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Collection Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Rendimiento de Cobranza — {selectedYear}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Analisis de cuotas vencidas hasta hoy vs. cobradas efectivamente
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Main collection rate */}
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
              <p
                className={`text-4xl font-bold ${
                  collectionRate >= 80
                    ? "text-emerald-600"
                    : collectionRate >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                }`}
              >
                {collectionRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-sm font-medium text-muted-foreground flex items-center justify-center gap-1">
                Tasa de Cobranza
                <CollectionHelpTooltip text="Porcentaje de cuotas cobradas sobre las vencidas a la fecha. Los pagos parciales se cuentan proporcionalmente (ej: pago de 50% = 0.5 cuotas cobradas)." />
              </p>
              <p className="text-xs text-muted-foreground">
                {installmentsPaidToDate} cobradas de {installmentsDueToDate} vencidas a la fecha
                {paidInAdvance > 0 && ` (+${paidInAdvance} anticipadas)`}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>100%</span>
              </div>
              <div className="h-4 w-full rounded-sm bg-muted">
                <div
                  className={`h-4 rounded-sm transition-all ${
                    collectionRate >= 80
                      ? "bg-emerald-500"
                      : collectionRate >= 50
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(collectionRate, 100)}%` }}
                />
              </div>
            </div>

            {/* Breakdown grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-card p-3 shadow-sm">
                <p className="text-2xl font-bold">{installmentsTotal}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Cuotas programadas en {selectedYear}
                  <CollectionHelpTooltip text="Total de cuotas generadas para todas las ventas activas durante este ano, independientemente de si ya vencieron o no." />
                </p>
              </div>
              <div className="rounded-md border bg-card p-3 shadow-sm">
                <p className="text-2xl font-bold">{installmentsDueToDate}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Ya vencidas (hasta hoy)
                  <CollectionHelpTooltip text="Cuotas cuya fecha de vencimiento ya paso. Incluye pagadas, parciales e impagas." />
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-fluent dark:border-emerald-900 dark:bg-emerald-950">
                <p className="text-2xl font-bold text-emerald-600">
                  {installmentsPaidToDate}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Cobradas (de vencidas)
                  <CollectionHelpTooltip text="Cuotas vencidas que fueron pagadas en su totalidad (estado PAGADA). No incluye pagos parciales ni pagos anticipados de cuotas futuras." />
                </p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-fluent dark:border-red-900 dark:bg-red-950">
                <p className="text-2xl font-bold text-red-600">
                  {overdueCount}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Impagas / vencidas
                  <CollectionHelpTooltip text="Cuotas vencidas que no se pagaron o se pagaron parcialmente. Incluye estados PENDIENTE, VENCIDA y PARCIAL." />
                </p>
              </div>
              {paidInAdvance > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-fluent dark:border-blue-900 dark:bg-blue-950 col-span-2">
                  <p className="text-2xl font-bold text-blue-600">
                    {paidInAdvance}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    Pagadas por anticipado
                    <CollectionHelpTooltip text="Cuotas cuya fecha de vencimiento es futura pero ya fueron pagadas. Indica pagos adelantados por parte del comprador." />
                  </p>
                </div>
              )}
            </div>

            {/* Detail metrics */}
            <div className="space-y-2 rounded-md border bg-card p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  Total pagadas en {selectedYear}
                  <CollectionHelpTooltip text="Total de cuotas pagadas en el ano, incluyendo tanto las vencidas como las anticipadas." />
                </span>
                <span className="font-semibold text-emerald-600">
                  {totalPaidInYear} de {installmentsTotal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  Deuda vencida pendiente
                  <CollectionHelpTooltip text="Suma del saldo adeudado de todas las cuotas vencidas impagas. Se calcula como monto total menos monto pagado de cada cuota." />
                </span>
                <span className="font-semibold text-red-600">
                  {formatCurrency(overdueAmount, "USD")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  Cuotas futuras (aun no vencen)
                  <CollectionHelpTooltip text="Cuotas cuya fecha de vencimiento es posterior a hoy. No se incluyen en la tasa de cobranza." />
                </span>
                <span className="font-semibold">
                  {installmentsPendingFuture}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  Dias promedio de cobro
                  <CollectionHelpTooltip text="Promedio de dias entre la fecha de vencimiento y la fecha real de pago. Valores negativos indican pagos anticipados." />
                </span>
                <span className="font-semibold">
                  {avgDaysToPayment > 0
                    ? `${avgDaysToPayment.toFixed(1)} dias`
                    : "Sin datos"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Section 5: Year-over-Year Comparison ───────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Comparacion Interanual — {selectedYear} vs {selectedYear - 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Metrica</th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {selectedYear - 1}
                  </th>
                  <th className="pb-2 pr-4 font-medium text-right">
                    {selectedYear}
                  </th>
                  <th className="pb-2 font-medium text-right">Variacion</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">Ingresos Totales (USD)</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(prevTotalUsdIncome, "USD")}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-semibold">
                    {formatCurrency(currentTotalUsdIncome, "USD")}
                  </td>
                  <td className="py-3 text-right">
                    <ChangeIndicator
                      current={currentTotalUsdIncome}
                      previous={prevTotalUsdIncome}
                    />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">Cantidad de Ventas</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {prevTotalSalesCount}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-semibold">
                    {totalSalesCount}
                  </td>
                  <td className="py-3 text-right">
                    <ChangeIndicator
                      current={totalSalesCount}
                      previous={prevTotalSalesCount}
                    />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 pr-4 font-medium">Precio Promedio Venta</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {formatCurrency(prevAvgSalePrice, "USD")}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-semibold">
                    {formatCurrency(avgSalePrice, "USD")}
                  </td>
                  <td className="py-3 text-right">
                    <ChangeIndicator
                      current={avgSalePrice}
                      previous={prevAvgSalePrice}
                    />
                  </td>
                </tr>
                <tr className="last:border-0">
                  <td className="py-3 pr-4 font-medium">Tasa de Cobranza</td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {prevCollectionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums font-semibold">
                    {collectionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 text-right">
                    <ChangeIndicator
                      current={collectionRate}
                      previous={prevCollectionRate}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
