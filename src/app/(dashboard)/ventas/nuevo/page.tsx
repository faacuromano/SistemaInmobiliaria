import { requirePermission } from "@/lib/auth-guard";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { getDevelopments } from "@/server/actions/development.actions";
import { getPersons } from "@/server/actions/person.actions";
import { getActiveSellers } from "@/server/actions/user.actions";
import { SaleForm } from "../_components/sale-form";

export default async function NewSalePage() {
  await requirePermission("sales:manage");

  const [developments, persons, sellers, lots] = await Promise.all([
    getDevelopments(),
    getPersons({ isActive: true }),
    getActiveSellers(),
    prisma.lot.findMany({
      where: { status: { in: ["DISPONIBLE", "RESERVADO"] } },
      select: {
        id: true,
        lotNumber: true,
        block: true,
        developmentId: true,
        status: true,
      },
      orderBy: { lotNumber: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Nueva Venta"
        description="Registrar una nueva operacion de venta"
      />
      <SaleForm
        developments={developments.map((d) => ({ id: d.id, name: d.name }))}
        lots={lots.map((l) => ({
          id: l.id,
          lotNumber: l.lotNumber,
          block: l.block,
          developmentId: l.developmentId,
          status: l.status,
        }))}
        persons={persons.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
        }))}
        sellers={sellers.map((s) => ({ id: s.id, name: `${s.name} ${s.lastName}`.trim() }))}
      />
    </div>
  );
}
