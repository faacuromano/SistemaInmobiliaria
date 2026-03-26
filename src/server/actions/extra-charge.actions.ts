"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { extraChargeModel } from "@/server/models/extra-charge.model";
import {
  extraChargeCreateSchema,
  extraChargeUpdateSchema,
} from "@/schemas/extra-charge.schema";
import * as extraChargeService from "@/server/services/extra-charge.service";
import { serializeDecimals } from "@/lib/serialize";
import type { ActionResult } from "@/types/actions";

type ExtraChargeRow = Awaited<ReturnType<typeof extraChargeModel.findBySaleId>>[number];

function serializeExtraCharge(charge: ExtraChargeRow) {
  return serializeDecimals(charge, ["amount", "paidAmount"]);
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

  try {
    await extraChargeService.createExtraCharge(parsed.data, session.user.id);
    revalidatePath(`/ventas/${parsed.data.saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el cargo extra" };
  }
}

export async function updateExtraCharge(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("sales:manage");

  const id = formData.get("id") as string;
  if (!id) return { success: false, error: "ID requerido" };

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
    const saleId = await extraChargeService.updateExtraCharge(id, parsed.data, session.user.id);
    revalidatePath(`/ventas/${saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el cargo extra" };
  }
}

export async function deleteExtraCharge(id: string): Promise<ActionResult> {
  const session = await requirePermission("sales:manage");

  if (!id) return { success: false, error: "ID requerido" };

  try {
    const saleId = await extraChargeService.deleteExtraCharge(id, session.user.id);
    revalidatePath(`/ventas/${saleId}`);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el cargo extra" };
  }
}
