import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import type { z } from "zod";
import type { saleTransferSchema } from "@/schemas/sale-transfer.schema";

type TransferData = z.output<typeof saleTransferSchema>;

export async function transferSale(
  data: TransferData,
  userId: string
): Promise<string> {
  // Validate sale exists and is ACTIVA
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: {
      installments: {
        orderBy: { installmentNumber: "asc" },
        select: {
          id: true,
          installmentNumber: true,
          amount: true,
          originalAmount: true,
          currency: true,
          dueDate: true,
          monthLabel: true,
          status: true,
          paidAmount: true,
          paidDate: true,
        },
      },
      person: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!sale) throw new ServiceError("Venta no encontrada");
  if (sale.status !== "ACTIVA") {
    throw new ServiceError("Solo se pueden transferir ventas activas");
  }

  // Validate target person exists and is different
  if (sale.personId === data.toPersonId) {
    throw new ServiceError("El nuevo cliente debe ser diferente al actual");
  }

  const toPerson = await prisma.person.findUnique({
    where: { id: data.toPersonId },
    select: { id: true },
  });
  if (!toPerson) throw new ServiceError("El nuevo cliente no existe");

  // Create snapshot of current installments
  const installmentSnapshot = sale.installments.map((inst) => ({
    installmentNumber: inst.installmentNumber,
    amount: Number(inst.amount),
    originalAmount: inst.originalAmount ? Number(inst.originalAmount) : null,
    currency: inst.currency,
    dueDate: inst.dueDate.toISOString(),
    monthLabel: inst.monthLabel,
    status: inst.status,
    paidAmount: Number(inst.paidAmount),
    paidDate: inst.paidDate?.toISOString() ?? null,
  }));

  try {
    const transferId = await prisma.$transaction(async (tx) => {
      // 1. Create transfer record
      const transfer = await tx.saleTransfer.create({
        data: {
          saleId: data.saleId,
          fromPersonId: sale.personId,
          toPersonId: data.toPersonId,
          transferDate: new Date(data.transferDate),
          installmentSnapshot: installmentSnapshot,
          renegotiated: data.renegotiate,
          notes: data.notes || null,
          createdById: userId,
        },
      });

      // 2. Update sale personId
      await tx.sale.update({
        where: { id: data.saleId },
        data: { personId: data.toPersonId },
      });

      // 3. If renegotiate: delete unpaid installments (and optionally create new ones)
      if (data.renegotiate) {
        // Get IDs of installments to delete
        const toDelete = await tx.installment.findMany({
          where: {
            saleId: data.saleId,
            status: { in: ["PENDIENTE", "VENCIDA", "PARCIAL"] },
          },
          select: { id: true },
        });
        const idsToDelete = toDelete.map((i) => i.id);

        if (idsToDelete.length > 0) {
          // Nullify CashMovement references before deleting
          await tx.cashMovement.updateMany({
            where: { installmentId: { in: idsToDelete } },
            data: { installmentId: null },
          });

          await tx.installment.deleteMany({
            where: { id: { in: idsToDelete } },
          });
        }

        // Create new installments if provided
        if (data.newInstallments.length > 0) {
          const maxPaid = await tx.installment.findFirst({
            where: { saleId: data.saleId },
            orderBy: { installmentNumber: "desc" },
            select: { installmentNumber: true },
          });
          const startNumber = (maxPaid?.installmentNumber ?? 0) + 1;

          await tx.installment.createMany({
            data: data.newInstallments.map((inst, index) => ({
              saleId: data.saleId,
              installmentNumber: startNumber + index,
              amount: inst.amount,
              currency: sale.currency,
              dueDate: new Date(inst.dueDate),
              monthLabel: null,
              status: "PENDIENTE" as const,
              paidAmount: 0,
            })),
          });
        }

        // Update sale totalInstallments count
        const totalInstallments = await tx.installment.count({
          where: { saleId: data.saleId },
        });
        await tx.sale.update({
          where: { id: data.saleId },
          data: { totalInstallments },
        });
      }

      return transfer.id;
    });

    await logAction(
      "Sale",
      data.saleId,
      "UPDATE",
      {
        oldData: { personId: sale.personId },
        newData: {
          action: "TRANSFERENCIA",
          personId: data.toPersonId,
          transferId,
          renegotiated: data.renegotiate,
        },
      },
      userId
    );

    return transferId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error al transferir venta:", error);
    throw new ServiceError("Error al transferir la venta");
  }
}

export async function getTransferHistory(saleId: string) {
  return prisma.saleTransfer.findMany({
    where: { saleId },
    include: {
      fromPerson: { select: { firstName: true, lastName: true } },
      toPerson: { select: { firstName: true, lastName: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
