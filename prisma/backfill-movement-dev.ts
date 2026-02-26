/**
 * One-off migration script: backfill developmentId on CashMovement records.
 *
 * CashMovement records created by payment actions (payInstallment, payExtraCharge,
 * recordDeliveryPayment) were missing developmentId. This script fills it in by
 * following the relation: CashMovement → Sale → Lot → developmentId.
 *
 * Usage: npx tsx prisma/backfill-movement-dev.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client/client";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // Find all CashMovements that have a saleId but no developmentId
  const orphaned = await prisma.cashMovement.findMany({
    where: {
      saleId: { not: null },
      developmentId: null,
    },
    select: {
      id: true,
      saleId: true,
      concept: true,
    },
  });

  console.log(`Found ${orphaned.length} CashMovement(s) with saleId but no developmentId.`);

  if (orphaned.length === 0) {
    console.log("Nothing to backfill.");
    await prisma.$disconnect();
    return;
  }

  // Collect unique saleIds and look up their lot's developmentId
  const saleIds = [...new Set(orphaned.map((m) => m.saleId!))];
  const sales = await prisma.sale.findMany({
    where: { id: { in: saleIds } },
    select: {
      id: true,
      lot: { select: { developmentId: true } },
    },
  });

  const saleToDevMap = new Map<string, string | null>();
  for (const sale of sales) {
    saleToDevMap.set(sale.id, sale.lot.developmentId);
  }

  // Update each orphaned movement
  let updated = 0;
  let skipped = 0;

  for (const movement of orphaned) {
    const devId = saleToDevMap.get(movement.saleId!);
    if (!devId) {
      console.log(`  SKIP: ${movement.id} (${movement.concept}) — sale has no lot developmentId`);
      skipped++;
      continue;
    }

    await prisma.cashMovement.update({
      where: { id: movement.id },
      data: { developmentId: devId },
    });
    updated++;
  }

  console.log(`\nDone! Updated: ${updated}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
