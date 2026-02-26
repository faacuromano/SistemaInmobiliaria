import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { getDevelopmentBySlug } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, MapPin } from "lucide-react";
import { hasPermission } from "@/lib/rbac";
import {
  DEVELOPMENT_STATUS_LABELS,
  DEVELOPMENT_STATUS_COLORS,
  DEVELOPMENT_TYPE_LABELS,
  LOT_STATUS_LABELS,
  LOT_STATUS_COLORS,
} from "@/lib/constants";
import { getTags } from "@/server/actions/tag.actions";
import { LotsSection } from "./_components/lots-section";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function DevelopmentDetailPage({ params }: Props) {
  const session = await requirePermission("developments:view");
  const { slug } = await params;
  const development = await getDevelopmentBySlug(slug);

  if (!development) notFound();

  const canManage = hasPermission(session.user.role, "developments:manage");
  const canManageLots = hasPermission(session.user.role, "lots:manage");
  const allTags = await getTags();
  const lotsByStatus = development.lots.reduce((acc, lot) => {
    acc[lot.status] = (acc[lot.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <PageHeader title={development.name} description={development.description ?? undefined}>
        {canManage && (
          <Button asChild variant="outline">
            <Link href={`/desarrollos/${slug}/editar`}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Link>
          </Button>
        )}
      </PageHeader>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge label={DEVELOPMENT_TYPE_LABELS[development.type]} variant="secondary" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge
              label={DEVELOPMENT_STATUS_LABELS[development.status]}
              variant={DEVELOPMENT_STATUS_COLORS[development.status]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ubicacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{development.location || "---"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lotes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{development._count.lots}</p>
          </CardContent>
        </Card>
      </div>

      {/* Lot status summary */}
      {Object.keys(lotsByStatus).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(lotsByStatus).map(([status, count]) => (
            <StatusBadge
              key={status}
              label={`${LOT_STATUS_LABELS[status as keyof typeof LOT_STATUS_LABELS]} (${count})`}
              variant={LOT_STATUS_COLORS[status as keyof typeof LOT_STATUS_COLORS]}
            />
          ))}
        </div>
      )}

      {/* Lots section — serialize Decimals to plain numbers for client */}
      <LotsSection
        lots={development.lots.map((lot) => ({
          id: lot.id,
          lotNumber: lot.lotNumber,
          block: lot.block,
          area: lot.area ? Number(lot.area) : null,
          listPrice: lot.listPrice ? Number(lot.listPrice) : null,
          status: lot.status,
          notes: lot.notes,
          sale: lot.sale
            ? {
                id: lot.sale.id,
                saleDate: lot.sale.saleDate.toISOString(),
                currency: lot.sale.currency as "USD" | "ARS",
                totalPrice: Number(lot.sale.totalPrice),
                person: {
                  firstName: lot.sale.person.firstName,
                  lastName: lot.sale.person.lastName,
                },
              }
            : null,
          tags: lot.tags.map((lt) => lt.tag),
        }))}
        developmentId={development.id}
        canManage={canManage}
        canManageLots={canManageLots}
        allTags={allTags.map((t) => ({ id: t.id, name: t.name, label: t.label, color: t.color, _count: t._count }))}
      />
    </div>
  );
}
