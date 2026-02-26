"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { lotModel } from "@/server/models/lot.model";
import { lotCreateSchema, lotUpdateSchema } from "@/schemas/lot.schema";
import { logAction } from "@/server/actions/audit-log.actions";
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
  await requirePermission("lots:manage");

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

  const exists = await lotModel.lotNumberExists(parsed.data.developmentId, parsed.data.lotNumber);
  if (exists) {
    return { success: false, error: "Ya existe un lote con ese número en este desarrollo" };
  }

  const lot = await lotModel.create({
    developmentId: parsed.data.developmentId,
    lotNumber: parsed.data.lotNumber,
    block: parsed.data.block || null,
    area: parsed.data.area ?? null,
    listPrice: parsed.data.listPrice ?? null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  await logAction("Lot", lot.id, "CREATE", {
    newData: { lotNumber: parsed.data.lotNumber, developmentId: parsed.data.developmentId, status: parsed.data.status },
  });

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function updateLot(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("lots:manage");

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

  const exists = await lotModel.lotNumberExists(
    parsed.data.developmentId,
    parsed.data.lotNumber,
    parsed.data.id
  );
  if (exists) {
    return { success: false, error: "Ya existe un lote con ese número en este desarrollo" };
  }

  await lotModel.update(parsed.data.id, {
    lotNumber: parsed.data.lotNumber,
    block: parsed.data.block || null,
    area: parsed.data.area ?? null,
    listPrice: parsed.data.listPrice ?? null,
    status: parsed.data.status,
    notes: parsed.data.notes || null,
  });

  await logAction("Lot", parsed.data.id, "UPDATE", {
    newData: { lotNumber: parsed.data.lotNumber, status: parsed.data.status },
  });

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function bulkUpdateLotStatus(
  lotIds: string[],
  status: LotStatus
): Promise<ActionResult> {
  await requirePermission("lots:manage");

  if (lotIds.length === 0) {
    return { success: false, error: "No se seleccionaron lotes" };
  }
  if (lotIds.length > 200) {
    return { success: false, error: "Maximo 200 lotes por operacion" };
  }

  const lotsWithSales = await lotModel.countWithSales(lotIds);
  if (lotsWithSales > 0) {
    return {
      success: false,
      error: `${lotsWithSales} lote(s) tienen venta asociada y no se pueden modificar en bloque`,
    };
  }

  await lotModel.bulkUpdateStatus(lotIds, status);

  await logAction("Lot", lotIds.join(","), "BULK_UPDATE", {
    newData: { status, count: lotIds.length },
  });

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function deleteLot(id: string): Promise<ActionResult> {
  await requirePermission("lots:manage");

  const hasSale = await lotModel.hasSale(id);
  if (hasSale) {
    return { success: false, error: "No se puede eliminar un lote con venta asociada" };
  }

  await lotModel.delete(id);

  await logAction("Lot", id, "DELETE");

  revalidatePath("/desarrollos");
  return { success: true };
}
