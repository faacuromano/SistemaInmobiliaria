"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { signingModel } from "@/server/models/signing.model";
import {
  signingCreateSchema,
  signingUpdateSchema,
} from "@/schemas/signing.schema";
import * as signingService from "@/server/services/signing.service";
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
    saleId: formData.get("saleId") ?? undefined,
  };

  const parsed = signingCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await signingService.createSigning(
      {
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
      },
      session.user.id
    );

    revalidatePath("/firmas");
    if (parsed.data.saleId) revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el turno de firma" };
  }
}

export async function updateSigning(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

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
    saleId: formData.get("saleId") ?? undefined,
    status: formData.get("status") || undefined,
  };

  const parsed = signingUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await signingService.updateSigning(
      parsed.data.id,
      {
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
      },
      session.user.id
    );

    revalidatePath("/firmas");
    if (parsed.data.saleId) revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el turno de firma" };
  }
}

export async function updateSigningStatus(
  id: string,
  status: SigningStatus
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  try {
    await signingService.updateSigningStatus(id, status, session.user.id);
    revalidatePath("/firmas");
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el estado de la firma" };
  }
}

export async function getSigningsByWeek(weekStart: string) {
  await requirePermission("signings:view");
  const from = new Date(weekStart);
  const to = new Date(weekStart);
  to.setDate(to.getDate() + 6);
  to.setHours(23, 59, 59, 999);
  return signingModel.findByDateRange(from, to);
}

export async function deleteSigning(id: string): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  try {
    await signingService.deleteSigning(id, session.user.id);
    revalidatePath("/firmas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el turno de firma" };
  }
}

export async function getUnlinkedSignings(developmentId: string) {
  await requirePermission("signings:view");
  return signingService.getUnlinkedSignings(developmentId);
}

export async function unlinkSigningFromSale(
  signingId: string
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  try {
    await signingService.unlinkSigningFromSale(signingId, session.user.id);
    revalidatePath("/firmas");
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al desvincular la firma" };
  }
}

export async function linkSigningToSale(
  signingId: string,
  saleId: string
): Promise<ActionResult> {
  const session = await requirePermission("signings:manage");

  try {
    await signingService.linkSigningToSale(signingId, saleId, session.user.id);
    revalidatePath("/firmas");
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al vincular la firma" };
  }
}
