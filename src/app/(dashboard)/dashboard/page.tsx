import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  MapPin,
  CalendarClock,
  FileSignature,
} from "lucide-react";
import { requireAuth } from "@/lib/auth-guard";
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

export default async function DashboardPage() {
  const session = await requireAuth();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Strip time from "today" so comparisons are date-only
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // ── KPI queries ─────────────────────────────────────────────
  const [
    activeSalesCount,
    overdueCount,
    monthlyIncome,
    availableLotsCount,
    recentSales,
    overdueInstallments,
    upcomingSignings,
    urgentSigningsCount,
    upcomingExtraCharges,
    urgentExtraChargesCount,
  ] = await Promise.all([
    prisma.sale.count({ where: { status: "ACTIVA" } }),

    prisma.installment.count({
      where: { status: "PENDIENTE", dueDate: { lt: today } },
    }),

    prisma.cashMovement.aggregate({
      where: {
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { usdIncome: true, arsIncome: true },
    }),

    prisma.lot.count({ where: { status: "DISPONIBLE" } }),

    // ── Recent sales ────────────────────────────────────────
    prisma.sale.findMany({
      take: 5,
      orderBy: { saleDate: "desc" },
      select: {
        id: true,
        saleDate: true,
        totalPrice: true,
        currency: true,
        status: true,
        lot: {
          select: {
            lotNumber: true,
            development: { select: { name: true } },
          },
        },
        person: {
          select: { firstName: true, lastName: true },
        },
      },
    }),

    // ── Overdue installments ────────────────────────────────
    prisma.installment.findMany({
      where: { status: "PENDIENTE", dueDate: { lt: today } },
      take: 10,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        installmentNumber: true,
        amount: true,
        currency: true,
        dueDate: true,
        sale: {
          select: {
            id: true,
            lot: {
              select: {
                lotNumber: true,
                development: { select: { name: true } },
              },
            },
            person: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    }),

    // ── Upcoming signings ───────────────────────────────────
    prisma.signingSlot.findMany({
      where: {
        date: { gte: today },
        status: { notIn: ["CANCELADA", "COMPLETADA"] },
      },
      take: 10,
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        time: true,
        lotInfo: true,
        clientName: true,
        status: true,
        development: { select: { name: true } },
      },
    }),

    // ── Urgent signings (within 3 days) ─────────────────────
    prisma.signingSlot.count({
      where: {
        date: { gte: today, lte: threeDaysFromNow },
        status: { notIn: ["CANCELADA", "COMPLETADA"] },
      },
    }),

    // ── Upcoming extra charges (refuerzos within 30 days) ──
    prisma.extraCharge.findMany({
      where: {
        status: "PENDIENTE",
        dueDate: { gte: today, lte: thirtyDaysFromNow },
      },
      take: 10,
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        description: true,
        amount: true,
        currency: true,
        dueDate: true,
        sale: {
          select: {
            id: true,
            lot: {
              select: {
                lotNumber: true,
                development: { select: { name: true } },
              },
            },
            person: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    }),

    // ── Urgent extra charges (within 7 days) ───────────────
    prisma.extraCharge.count({
      where: {
        status: "PENDIENTE",
        dueDate: { gte: today, lte: sevenDaysFromNow },
      },
    }),
  ]);

  const totalUsdIncome = Number(monthlyIncome._sum.usdIncome ?? 0);
  const totalArsIncome = Number(monthlyIncome._sum.arsIncome ?? 0);

  // Helper: compute days overdue
  function daysOverdue(dueDate: Date): number {
    const diff = today.getTime() - new Date(dueDate).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  // Helper: compute days until a future date
  function daysUntil(date: Date): number {
    const diff = new Date(date).getTime() - today.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={`Bienvenido, ${session.user.name}`}
        icon={LayoutDashboard}
        accentColor="border-primary"
      />

      {/* ── KPI Cards ──────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ventas Activas */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeSalesCount}</p>
              <p className="text-[13px] text-muted-foreground">Ventas Activas</p>
            </div>
          </CardContent>
        </Card>

        {/* Cuotas Vencidas */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{overdueCount}</p>
              <p className="text-[13px] text-muted-foreground">Cuotas Vencidas</p>
            </div>
          </CardContent>
        </Card>

        {/* Ingresos del Mes */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(totalUsdIncome, "USD")}
              </p>
              {totalArsIncome > 0 && (
                <p className="text-xs text-muted-foreground">
                  + {formatCurrency(totalArsIncome, "ARS")}
                </p>
              )}
              <p className="text-[13px] text-muted-foreground">Ingresos del Mes</p>
            </div>
          </CardContent>
        </Card>

        {/* Lotes Disponibles */}
        <Card>
          <CardContent className="flex items-center gap-4 pt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableLotsCount}</p>
              <p className="text-[13px] text-muted-foreground">
                Lotes Disponibles
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Middle Row: Recent Sales + Upcoming Signings ──── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Recent Sales */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Ventas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay ventas registradas.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Lote</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Comprador</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Precio</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Estado</th>
                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b last:border-0 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-2">
                          <Link
                            href={`/ventas/${sale.id}`}
                            className="font-medium hover:underline"
                          >
                            {sale.lot.development.name} - Lote{" "}
                            {sale.lot.lotNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {sale.person.firstName} {sale.person.lastName}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(
                            Number(sale.totalPrice),
                            sale.currency as "USD" | "ARS"
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <StatusBadge
                            label={
                              SALE_STATUS_LABELS[sale.status as SaleStatus]
                            }
                            variant={
                              SALE_STATUS_COLORS[sale.status as SaleStatus]
                            }
                          />
                        </td>
                        <td className="px-3 py-2">{formatDate(sale.saleDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {recentSales.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/ventas"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Ver todas las ventas
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Signings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                Proximas Firmas
              </CardTitle>
              {urgentSigningsCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-md bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  <FileSignature className="h-3.5 w-3.5" />
                  {urgentSigningsCount} en 3 dias
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingSignings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay firmas programadas.
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingSignings.map((signing) => {
                  const days = daysUntil(signing.date);
                  const isUrgent = days <= 3;
                  return (
                    <li
                      key={signing.id}
                      className={`flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 ${
                        isUrgent
                          ? "rounded-md border-l-4 border-l-orange-500 bg-orange-50/50 pl-3 dark:bg-orange-950/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {formatDate(signing.date)} - {signing.time}
                        </span>
                        <div className="flex items-center gap-2">
                          {isUrgent && (
                            <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                              {days === 0
                                ? "Hoy"
                                : days === 1
                                  ? "Manana"
                                  : `En ${days} dias`}
                            </span>
                          )}
                          <StatusBadge
                            label={
                              SIGNING_STATUS_LABELS[
                                signing.status as SigningStatus
                              ]
                            }
                            variant={
                              SIGNING_STATUS_COLORS[
                                signing.status as SigningStatus
                              ]
                            }
                          />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {signing.development?.name
                          ? `${signing.development.name} - `
                          : ""}
                        {signing.lotInfo}
                      </span>
                      {signing.clientName && (
                        <span className="text-xs text-muted-foreground">
                          {signing.clientName}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {upcomingSignings.length > 0 && (
              <div className="mt-4">
                <Link
                  href="/firmas"
                  className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  Ver agenda completa
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Extra Charges (Refuerzos) ─────────── */}
      {upcomingExtraCharges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                Refuerzos Proximos
              </CardTitle>
              {urgentExtraChargesCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {urgentExtraChargesCount} en 7 dias
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Descripcion</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Comprador</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Lote</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Monto</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Vencimiento</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wider">Dias</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingExtraCharges.map((charge) => {
                    const days = daysUntil(charge.dueDate);
                    const isUrgent = days <= 7;
                    return (
                      <tr
                        key={charge.id}
                        className={`border-b last:border-0 hover:bg-accent/40 transition-colors ${
                          isUrgent
                            ? "bg-amber-50/50 dark:bg-amber-950/20"
                            : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <Link
                            href={`/ventas/${charge.sale.id}`}
                            className="font-medium hover:underline"
                          >
                            {charge.description}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {charge.sale.person.firstName}{" "}
                          {charge.sale.person.lastName}
                        </td>
                        <td className="px-3 py-2">
                          {charge.sale.lot.development.name} - Lote{" "}
                          {charge.sale.lot.lotNumber}
                        </td>
                        <td className="px-3 py-2">
                          {formatCurrency(
                            Number(charge.amount),
                            charge.currency as "USD" | "ARS"
                          )}
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            isUrgent
                              ? "font-medium text-amber-600 dark:text-amber-400"
                              : ""
                          }`}
                        >
                          {formatDate(charge.dueDate)}
                        </td>
                        <td
                          className={`px-3 py-2 ${
                            isUrgent
                              ? "font-semibold text-amber-600 dark:text-amber-400"
                              : ""
                          }`}
                        >
                          {days === 0
                            ? "Hoy"
                            : days === 1
                              ? "Manana"
                              : `${days} dias`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Overdue Installments (full width) ────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cuotas Vencidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overdueInstallments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cuotas vencidas. Todo al dia.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Lote</th>
                    <th className="pb-2 pr-4 font-medium">Comprador</th>
                    <th className="pb-2 pr-4 font-medium">Cuota N.o</th>
                    <th className="pb-2 pr-4 font-medium">Monto</th>
                    <th className="pb-2 pr-4 font-medium">Vencimiento</th>
                    <th className="pb-2 font-medium">Dias de Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {overdueInstallments.map((inst) => {
                    const days = daysOverdue(inst.dueDate);
                    return (
                      <tr key={inst.id} className="border-b last:border-0 hover:bg-accent/40 transition-colors">
                        <td className="px-3 py-2">
                          <Link
                            href={`/ventas/${inst.sale.id}`}
                            className="font-medium hover:underline"
                          >
                            {inst.sale.lot.development.name} - Lote{" "}
                            {inst.sale.lot.lotNumber}
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          {inst.sale.person.firstName}{" "}
                          {inst.sale.person.lastName}
                        </td>
                        <td className="px-3 py-2">{inst.installmentNumber}</td>
                        <td className="px-3 py-2">
                          {formatCurrency(
                            Number(inst.amount),
                            inst.currency as "USD" | "ARS"
                          )}
                        </td>
                        <td className="px-4 py-3 text-destructive font-medium">
                          {formatDate(inst.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-destructive font-semibold">
                          {days} {days === 1 ? "dia" : "dias"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
