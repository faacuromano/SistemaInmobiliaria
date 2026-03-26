import { prisma } from "@/lib/prisma";
import { recalculateInstallments } from "@/lib/installment-recalculator";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { extraChargeModel } from "@/server/models/extra-charge.model";
import type { z } from "zod";
import type {
  extraChargeCreateSchema,
  extraChargeUpdateSchema,
} from "@/schemas/extra-charge.schema";

type ExtraChargeCreateData = z.output<typeof extraChargeCreateSchema>;
type ExtraChargeUpdateData = z.output<typeof extraChargeUpdateSchema>;

// ---------------------------------------------------------------------------
// Create Extra Charge
// ---------------------------------------------------------------------------

export async function createExtraCharge(
  data: ExtraChargeCreateData,
  userId: string
): Promise<void> {
  // Validate sale exists and is active
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    select: { id: true, status: true },
  });
  if (!sale) throw new ServiceError("Venta no encontrada");
  if (sale.status !== "ACTIVA") {
    throw new ServiceError("Solo se pueden agregar cargos a ventas activas");
  }

  const isInKind = data.isInKind === true;

  try {
    const charge = await extraChargeModel.create({
      saleId: data.saleId,
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      dueDate: new Date(data.dueDate),
      isInKind,
      inKindType: isInKind ? (data.inKindType || null) : null,
      status: isInKind ? "PAGADA" : "PENDIENTE",
      paidAmount: isInKind ? data.amount : 0,
      paidDate: isInKind ? new Date() : undefined,
      notes: data.notes || undefined,
      createdById: userId,
    });

    // In-kind charges are already PAGADA, so recalculate installments immediately
    if (isInKind) {
      await recalculateInstallments(data.saleId, data.amount);
    }

    await logAction(
      "ExtraCharge",
      charge.id,
      "CREATE",
      {
        newData: {
          saleId: data.saleId,
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          isInKind,
        },
      },
      userId
    );
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error creating extra charge:", error);
    throw new ServiceError("Error al crear el cargo extra");
  }
}

// ---------------------------------------------------------------------------
// Update Extra Charge
// ---------------------------------------------------------------------------

export async function updateExtraCharge(
  id: string,
  data: ExtraChargeUpdateData,
  userId: string
): Promise<string> {
  const existing = await extraChargeModel.findById(id);
  if (!existing) throw new ServiceError("Cargo no encontrado");
  if (existing.status !== "PENDIENTE") {
    throw new ServiceError("Solo se pueden editar cargos pendientes");
  }

  try {
    const updateData: Parameters<typeof extraChargeModel.update>[1] = {};
    if (data.description) updateData.description = data.description;
    if (data.amount) updateData.amount = data.amount;
    if (data.currency) updateData.currency = data.currency;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.notes !== undefined) updateData.notes = data.notes || undefined;

    await extraChargeModel.update(id, updateData);

    await logAction("ExtraCharge", id, "UPDATE", { newData: updateData }, userId);

    return existing.saleId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error updating extra charge:", error);
    throw new ServiceError("Error al actualizar el cargo extra");
  }
}

// ---------------------------------------------------------------------------
// Delete Extra Charge
// ---------------------------------------------------------------------------

export async function deleteExtraCharge(id: string, userId: string): Promise<string> {
  const existing = await extraChargeModel.findById(id);
  if (!existing) throw new ServiceError("Cargo no encontrado");
  if (existing.status !== "PENDIENTE") {
    throw new ServiceError("Solo se pueden eliminar cargos pendientes");
  }

  try {
    await extraChargeModel.delete(id);

    await logAction("ExtraCharge", id, "DELETE", {
      oldData: {
        description: existing.description,
        amount: Number(existing.amount),
        saleId: existing.saleId,
      },
    }, userId);

    return existing.saleId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error deleting extra charge:", error);
    throw new ServiceError("Error al eliminar el cargo extra");
  }
}
