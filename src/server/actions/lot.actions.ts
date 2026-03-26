"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { lotModel } from "@/server/models/lot.model";
import { lotCreateSchema, lotUpdateSchema } from "@/schemas/lot.schema";
import * as lotService from "@/server/services/lot.service";
import type { ActionResult } from "@/types/actions";
import type { LotStatus } from "@/generated/prisma/client/client";

export async function getLotsByDevelopment(
  developmentId: string,
  params?: { search?: string; status?: LotStatus }
) {
  await requirePermission("lots:view");
  return lotModel.findByDevelopmentId(developmentId, params);
}

export async function createLot(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  const raw = {
    developmentId: formData.get("developmentId"),
    lotNumber: formData.get("lotNumber"),
    block: formData.get("block"),
    area: formData.get("area"),
    listPrice: formData.get("listPrice"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  };

  const parsed = lotCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await lotService.createLot(parsed.data, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el lote" };
  }
}

export async function updateLot(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  const raw = {
    id: formData.get("id"),
    developmentId: formData.get("developmentId"),
    lotNumber: formData.get("lotNumber"),
    block: formData.get("block"),
    area: formData.get("area"),
    listPrice: formData.get("listPrice"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  };

  const parsed = lotUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await lotService.updateLot(parsed.data, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el lote" };
  }
}

export async function bulkUpdateLotStatus(
  lotIds: string[],
  status: LotStatus
): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  try {
    await lotService.bulkUpdateLotStatus(lotIds, status, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar lotes" };
  }
}

export async function deleteLot(id: string): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  try {
    await lotService.deleteLot(id, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el lote" };
  }
}
