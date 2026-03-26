import { prisma } from "@/lib/prisma";

// Transaction client type compatible with prisma.$transaction callback parameter
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Recalculates unpaid installment amounts after an extra charge (refuerzo) is paid.
 *
 * The paid extra charge amount is distributed evenly across all unpaid installments
 * (PENDIENTE, VENCIDA, or PARCIAL), reducing each one proportionally.
 * This preserves the original amount on first recalculation so it can be shown
 * as a strikethrough reference in the UI.
 *
 * @param saleId - The sale whose installments should be recalculated
 * @param paidExtraChargeAmount - The extra charge amount that was paid (positive number)
 * @param tx - Optional transaction client. When provided, all operations run inside that transaction.
 */
export async function recalculateInstallments(
  saleId: string,
  paidExtraChargeAmount: number,
  tx?: TxClient
): Promise<void> {
  const db = tx ?? prisma;

  // 1. Fetch all unpaid installments (pending, overdue, or partially paid)
  const unpaidInstallments = await db.installment.findMany({
    where: {
      saleId,
      status: { in: ["PENDIENTE", "VENCIDA", "PARCIAL"] },
    },
    orderBy: { installmentNumber: "asc" },
  });

  if (unpaidInstallments.length === 0) {
    return;
  }

  // 2. Calculate the reduction per installment
  const reductionPerInstallment =
    paidExtraChargeAmount / unpaidInstallments.length;

  // 3. Update each unpaid installment
  for (const installment of unpaidInstallments) {
    const currentAmount = Number(installment.amount);
    const newAmount = Math.max(currentAmount - reductionPerInstallment, 0);
    const roundedAmount = Math.round(newAmount * 100) / 100;
    const isZeroed = roundedAmount === 0;

    await db.installment.update({
      where: { id: installment.id },
      data: {
        // Preserve the first original amount; don't overwrite on subsequent recalculations
        originalAmount:
          installment.originalAmount === null ? currentAmount : undefined,
        amount: roundedAmount,
        // Mark zeroed-out installments as fully paid
        ...(isZeroed
          ? {
              status: "PAGADA" as const,
              paidAmount: currentAmount,
              paidDate: new Date(),
            }
          : {}),
      },
    });
  }

  // 4. If all installments are now paid, auto-complete the sale
  const remainingUnpaid = await db.installment.count({
    where: {
      saleId,
      status: { not: "PAGADA" },
    },
  });

  if (remainingUnpaid === 0) {
    await db.sale.update({
      where: { id: saleId },
      data: { status: "COMPLETADA" },
    });
  }
}
