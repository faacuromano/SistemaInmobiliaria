"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { signingModel } from "@/server/models/signing.model";
import {
  signingCreateSchema,
  signingUpdateSchema,
} from "@/schemas/signing.schema";
import { logAction } from "@/server/actions/audit-log.actions";
import { completeSigningSlot } from "@/server/services/signing.service";
import type { ActionResult } from "@/types/actions";
import type { SigningStatus } from "@/types/enums";

export async function getSignings(params?: {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  developmentId?: string;
  sellerId?: string;
  search?: string;
}) {
  await requirePermission("signings:view");
  return signingModel.findAll(params);
}

export async function getSigningById(id: string) {
  await requirePermission("signings:view");
  return signingModel.findById(id);
}

export async function createSigning(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  const raw = {
    date: formData.get("date"),
    time: formData.get("time"),
    endTime: formData.get("endTime"),
    lotInfo: formData.get("lotInfo"),
    clientName: formData.get("clientName"),
    lotNumbers: formData.get("lotNumbers"),
    developmentId: formData.get("developmentId"),
    sellerId: formData.get("sellerId"),
    notes: formData.get("notes"),
    saleId: formData.get("saleId"),
  };

  const parsed = signingCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const signing = await signingModel.create({
    date: new Date(parsed.data.date),
    time: parsed.data.time,
    endTime: parsed.data.endTime || null,
    lotInfo: parsed.data.lotInfo,
    clientName: parsed.data.clientName || null,
    lotNumbers: parsed.data.lotNumbers || null,
    developmentId: parsed.data.developmentId || null,
    sellerId: parsed.data.sellerId || null,
    notes: parsed.data.notes || null,
    createdById: session.user.id,
    saleId: parsed.data.saleId || null,
  });

  await logAction("SigningSlot", signing.id, "CREATE", {
    newData: { date: parsed.data.date, time: parsed.data.time, lotInfo: parsed.data.lotInfo },
  }, session.user.id);

  revalidatePath("/firmas");
  return { success: true };
}

export async function updateSigning(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("signings:manage");

  const raw = {
    id: formData.get("id"),
    date: formData.get("date"),
    time: formData.get("time"),
    endTime: formData.get("endTime"),
    lotInfo: formData.get("lotInfo"),
    clientName: formData.get("clientName"),
    lotNumbers: formData.get("lotNumbers"),
    developmentId: formData.get("developmentId"),
    sellerId: formData.get("sellerId"),
    notes: formData.get("notes"),
    saleId: formData.get("saleId"),
    status: formData.get("status") || undefined,
  };

  const parsed = signingUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  await signingModel.update(parsed.data.id, {
    date: new Date(parsed.data.date),
    time: parsed.data.time,
    endTime: parsed.data.endTime || null,
    lotInfo: parsed.data.lotInfo,
    clientName: parsed.data.clientName || null,
    lotNumbers: parsed.data.lotNumbers || null,
    developmentId: parsed.data.developmentId || null,
    sellerId: parsed.data.sellerId || null,
    notes: parsed.data.notes || null,
    saleId: parsed.data.saleId || null,
    status: parsed.data.status,
  });

  await logAction("SigningSlot", parsed.data.id, "UPDATE", {
    newData: { date: parsed.data.date, time: parsed.data.time, lotInfo: parsed.data.lotInfo, status: parsed.data.status },
  });

  revalidatePath("/firmas");
  return { success: true };
}

export async function updateSigningStatus(
  id: string,
  status: SigningStatus
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  const signing = await signingModel.findById(id);
  if (!signing) {
    return { success: false, error: "Turno de firma no encontrado" };
  }

  try {
    if (status === "COMPLETADA") {
      // Route through signing service for atomic status + commission
      await completeSigningSlot({ signingId: id, userId: session.user.id });
    } else {
      // Non-COMPLETADA status changes use the model directly
      await signingModel.updateStatus(id, status);
      await logAction("SigningSlot", id, "UPDATE", {
        oldData: { status: signing.status },
        newData: { status },
      }, session.user.id);
    }
  } catch (error) {
    if (error instanceof Error && error.name === "ServiceError") {
      return { success: false, error: error.message };
    }
    console.error("Error al actualizar estado de firma:", error);
    return { success: false, error: "Error al actualizar el estado de la firma" };
  }

  revalidatePath("/firmas");
  revalidatePath("/ventas");
  return { success: true };
}

export async function getSigningsByWeek(weekStart: string) {
  await requirePermission("signings:view");
  const from = new Date(weekStart);
  const to = new Date(weekStart);
  to.setDate(to.getDate() + 6); // Mon-Sun (full week)
  to.setHours(23, 59, 59, 999);
  return signingModel.findByDateRange(from, to);
}

export async function deleteSigning(id: string): Promise<ActionResult> {
  await requirePermission("signings:manage");

  const signing = await signingModel.findById(id);
  if (!signing) {
    return { success: false, error: "Turno de firma no encontrado" };
  }

  await signingModel.delete(id);

  await logAction("SigningSlot", id, "DELETE", {
    oldData: { lotInfo: signing.lotInfo, date: signing.date, time: signing.time },
  });

  revalidatePath("/firmas");
  return { success: true };
}
