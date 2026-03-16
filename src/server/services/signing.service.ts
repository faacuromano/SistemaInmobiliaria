import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";

interface CompleteSigningParams {
  signingId: string;
  userId: string;
}

export async function completeSigningSlot(params: CompleteSigningParams): Promise<void> {
  const { signingId, userId } = params;

  // 1. Fetch signing with linked sale data inside the transaction for consistency
  await prisma.$transaction(async (tx) => {
    const signing = await tx.signingSlot.findUnique({
      where: { id: signingId },
      include: {
        sale: {
          select: {
            id: true,
            sellerId: true,
            currency: true,
            commissionAmount: true,
            lot: {
              select: {
                lotNumber: true,
                developmentId: true,
              },
            },
            seller: {
              select: { name: true, lastName: true },
            },
          },
        },
      },
    });

    if (!signing) throw new ServiceError("Turno de firma no encontrado");

    // 2. Update signing status to COMPLETADA
    await tx.signingSlot.update({
      where: { id: signingId },
      data: { status: "COMPLETADA" },
    });

    // 3. Auto-create commission if sale is linked and has commissionAmount > 0
    if (!signing.sale) return;

    const sale = signing.sale;
    const commissionAmount = sale.commissionAmount ? Number(sale.commissionAmount) : 0;

    if (commissionAmount <= 0) return; // Silent skip — no warning needed

    // 4. Idempotency check — skip if commission already exists for this sale
    const existingCommission = await tx.cashMovement.findFirst({
      where: {
        type: "COMISION",
        saleId: sale.id,
      },
      select: { id: true },
    });

    if (existingCommission) return; // Already has commission — skip

    // 5. Create COMISION CashMovement
    const isUSD = sale.currency === "USD";
    const sellerName = sale.seller
      ? `${sale.seller.name} ${sale.seller.lastName}`.trim()
      : "Sin vendedor";

    await tx.cashMovement.create({
      data: {
        saleId: sale.id,
        personId: null, // Commission goes to seller, not client
        developmentId: sale.lot.developmentId,
        date: new Date(),
        type: "COMISION",
        concept: `COMISION - LOTE ${sale.lot.lotNumber}`,
        detail: null,
        usdIncome: null,
        arsIncome: null,
        usdExpense: isUSD ? commissionAmount : null,
        arsExpense: !isUSD ? commissionAmount : null,
        manualRate: null,
        registeredById: userId,
        notes: sale.sellerId
          ? `Vendedor: ${sellerName} (${sale.sellerId})`
          : null,
      },
    });
  });

  // Audit log outside transaction (non-critical — should not block)
  await logAction(
    "SigningSlot",
    signingId,
    "UPDATE",
    { newData: { status: "COMPLETADA", action: "AUTO_COMISION" } },
    userId
  );
}
