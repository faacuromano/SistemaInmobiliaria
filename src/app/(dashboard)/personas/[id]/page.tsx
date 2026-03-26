import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { getPersonById } from "@/server/actions/person.actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Mail, Phone, MapPin, User, ChevronRight, Calendar } from "lucide-react";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { PERSON_TYPE_LABELS, PERSON_TYPE_COLORS, SALE_STATUS_LABELS, SALE_STATUS_COLORS } from "@/lib/constants";
import { formatDate, formatCurrency } from "@/lib/format";
import { DebtSummary } from "./_components/debt-summary";
import { PendingInstallments } from "./_components/pending-installments";
import { PaymentHistory } from "./_components/payment-history";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PersonDetailPage({ params }: Props) {
  const session = await requirePermission("persons:view");
  const { id } = await params;
  const person = await getPersonById(id);

  if (!person) notFound();

  const canManage = await checkPermissionDb(session.user.role as Role, "persons:manage");

  // Serialize Prisma Decimals to plain numbers for client components
  // JSON round-trip converts all Decimal instances to numbers and Dates to strings
  const serializedSales = JSON.parse(JSON.stringify(person.sales)) as typeof person.sales;
  const serializedMovements = JSON.parse(JSON.stringify(person.cashMovements)) as typeof person.cashMovements;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${person.firstName} ${person.lastName}`}
        description={person.isActive ? undefined : "Persona inactiva"}
        icon={User}
        accentColor="border-emerald-600"
      >
        <div className="flex items-center gap-2">
          <StatusBadge
            label={PERSON_TYPE_LABELS[person.type]}
            variant={PERSON_TYPE_COLORS[person.type]}
          />
          {!person.isActive && <Badge variant="outline">Inactivo</Badge>}
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/personas/${id}/editar`}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Unified contact & identity card */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion Personal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Identity column */}
            <div className="space-y-3">
              {person.dni && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">DNI</p>
                  <p className="text-sm font-medium">{person.dni}</p>
                </div>
              )}
              {person.cuit && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">CUIT</p>
                  <p className="text-sm font-medium">{person.cuit}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Tipo</p>
                <div className="mt-0.5">
                  <StatusBadge
                    label={PERSON_TYPE_LABELS[person.type]}
                    variant={PERSON_TYPE_COLORS[person.type]}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Registrado</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-sm font-medium">{formatDate(person.createdAt)}</p>
                </div>
              </div>
            </div>

            <Separator className="sm:hidden" />

            {/* Contact column */}
            <div className="space-y-3">
              {person.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{person.email}</span>
                </div>
              )}
              {person.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{person.phone}</span>
                </div>
              )}
              {person.phone2 && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{person.phone2}</span>
                </div>
              )}
              {person.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {person.address}
                    {person.city && `, ${person.city}`}
                    {person.province && `, ${person.province}`}
                  </span>
                </div>
              )}
              {!person.email && !person.phone && !person.phone2 && !person.address && (
                <p className="text-sm text-muted-foreground">Sin datos de contacto.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notas — positioned after personal info, before financial data */}
      {person.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{person.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Resumen de deuda */}
      {serializedSales.length > 0 && (
        <DebtSummary sales={serializedSales} />
      )}

      {/* Ventas */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas ({person.sales.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {person.sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
          ) : (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Lote</th>
                    <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Desarrollo</th>
                    <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Fecha</th>
                    <th className="p-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Precio</th>
                    <th className="p-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th className="p-3 text-xs font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {person.sales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0 even:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{sale.lot.lotNumber}</td>
                      <td className="p-3 text-sm">{sale.lot.development.name}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{formatDate(sale.saleDate)}</td>
                      <td className="p-3 text-sm text-right font-medium hidden sm:table-cell">
                        {formatCurrency(Number(sale.totalPrice), sale.currency)}
                      </td>
                      <td className="p-3 text-sm">
                        <Badge variant={SALE_STATUS_COLORS[sale.status]}>
                          {SALE_STATUS_LABELS[sale.status]}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/ventas/${sale.id}`}>
                            Ver
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cuotas pendientes */}
      <PendingInstallments sales={serializedSales} />

      {/* Historial de pagos */}
      <PaymentHistory movements={serializedMovements} />
    </div>
  );
}
