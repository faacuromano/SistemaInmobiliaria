"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { extraChargeModel } from "@/server/models/extra-charge.model";
import {
  extraChargeCreateSchema,
  extraChargeUpdateSchema,
} from "@/schemas/extra-charge.schema";
import { recalculateInstallments } from "@/lib/installment-recalculator";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";

// Serialize Decimal fields to plain numbers for client consumption
function serializeExtraCharge(charge: Record<string, unknown>) {
  return {
    ...charge,
    amount: Number(charge.amount),
    paidAmount: Number(charge.paidAmount),
  };
}

export async function getExtraChargesBySale(saleId: string) {
  await requirePermission("sales:view");

  try {
    const charges = await extraChargeModel.findBySaleId(saleId);
    return charges.map(serializeExtraCharge);
  } catch (error) {
    console.error("Error fetching extra charges:", error);
    return [];
  }
}

export async function createExtraCharge(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("sales:manage");

  const raw = {
    saleId: formData.get("saleId"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    dueDate: formData.get("dueDate"),
    isInKind: formData.get("isInKind"),
    inKindType: formData.get("inKindType"),
    notes: formData.get("notes"),
  };

  const parsed = extraChargeCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos invalidos",
    };
  }

  const data = parsed.data;

  // Validate sale exists and is active
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    select: { id: true, status: true },
  });
  if (!sale) {
    return { success: false, error: "Venta no encontrada" };
  }
  if (sale.status !== "ACTIVA") {
    return {
      success: false,
      error: "Solo se pueden agregar cargos a ventas activas",
    };
  }

  try {
    // In-kind payments are automatically marked as PAGADA at creation
    const isInKind = data.isInKind === true;

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
      createdById: session.user.id,
    });

    // In-kind charges are already PAGADA, so recalculate installments immediately
    if (isInKind) {
      await recalculateInstallments(data.saleId, data.amount);
    }

    await logAction("ExtraCharge", charge.id, "CREATE", {
      newData: { saleId: data.saleId, description: data.description, amount: data.amount, currency: data.currency, isInKind },
    }, session.user.id);

    revalidatePath(`/ventas/${data.saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    console.error("Error creating extra charge:", error);
    return { success: false, error: "Error al crear el cargo extra" };
  }
}

export async function updateExtraCharge(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("sales:manage");

  const id = formData.get("id") as string;
  if (!id) {
    return { success: false, error: "ID requerido" };
  }

  // Verify it exists and is PENDIENTE
  const existing = await extraChargeModel.findById(id);
  if (!existing) {
    return { success: false, error: "Cargo no encontrado" };
  }
  if (existing.status !== "PENDIENTE") {
    return {
      success: false,
      error: "Solo se pueden editar cargos pendientes",
    };
  }

  const raw = {
    description: formData.get("description"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    dueDate: formData.get("dueDate"),
    notes: formData.get("notes"),
  };

  const parsed = extraChargeUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos invalidos",
    };
  }

  try {
    const updateData: Record<string, unknown> = {};
    if (parsed.data.description) updateData.description = parsed.data.description;
    if (parsed.data.amount) updateData.amount = parsed.data.amount;
    if (parsed.data.currency) updateData.currency = parsed.data.currency;
    if (parsed.data.dueDate) updateData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes || null;

    await extraChargeModel.update(id, updateData);

    await logAction("ExtraCharge", id, "UPDATE", {
      newData: updateData,
    });

    revalidatePath(`/ventas/${existing.saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    console.error("Error updating extra charge:", error);
    return { success: false, error: "Error al actualizar el cargo extra" };
  }
}

export async function deleteExtraCharge(id: string): Promise<ActionResult> {
  await requirePermission("sales:manage");

  if (!id) {
    return { success: false, error: "ID requerido" };
  }

  const existing = await extraChargeModel.findById(id);
  if (!existing) {
    return { success: false, error: "Cargo no encontrado" };
  }
  if (existing.status !== "PENDIENTE") {
    return {
      success: false,
      error: "Solo se pueden eliminar cargos pendientes",
    };
  }

  try {
    await extraChargeModel.delete(id);

    await logAction("ExtraCharge", id, "DELETE", {
      oldData: { description: existing.description, amount: Number(existing.amount), saleId: existing.saleId },
    });

    revalidatePath(`/ventas/${existing.saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    console.error("Error deleting extra charge:", error);
    return { success: false, error: "Error al eliminar el cargo extra" };
  }
}
