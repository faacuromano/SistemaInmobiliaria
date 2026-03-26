"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-guard";
import { notificationModel } from "@/server/models/notification.model";
import { installmentModel } from "@/server/models/installment.model";
import { extraChargeModel } from "@/server/models/extra-charge.model";
import type { NotificationType } from "@/generated/prisma/client/client";

export async function getMyNotifications(params?: { read?: boolean }) {
  const session = await requireAuth();
  return notificationModel.findByUserId(session.user.id, params);
}

export async function getUnreadCount() {
  const session = await requireAuth();
  return notificationModel.countUnread(session.user.id);
}

export async function markNotificationRead(id: string) {
  const session = await requireAuth();

  const notification = await notificationModel.findById(id);
  if (!notification) {
    return { success: false as const, error: "Notificacion no encontrada" };
  }
  if (notification.userId !== session.user.id) {
    return { success: false as const, error: "Permiso denegado" };
  }

  await notificationModel.markAsRead(id);
  revalidatePath("/");
  return { success: true as const };
}

export async function markAllNotificationsRead() {
  const session = await requireAuth();
  await notificationModel.markAllAsRead(session.user.id);
  revalidatePath("/");
  return { success: true as const };
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  referenceType?: string,
  referenceId?: string
) {
  await requirePermission("config:manage");

  await notificationModel.create({
    userId,
    type,
    title,
    body,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
  });

  return { success: true as const };
}

export async function resolveNotificationUrl(
  referenceType: string,
  referenceId: string | null
): Promise<string | null> {
  await requireAuth();

  switch (referenceType) {
    case "Sale":
      return referenceId ? `/ventas/${referenceId}` : "/ventas";

    case "Installment": {
      if (!referenceId) return "/cobranza";
      const saleId = await installmentModel.findSaleIdById(referenceId);
      return saleId ? `/ventas/${saleId}` : "/cobranza";
    }

    case "ExtraCharge": {
      if (!referenceId) return "/cobranza";
      const saleId = await extraChargeModel.findSaleIdById(referenceId);
      return saleId ? `/ventas/${saleId}` : "/cobranza";
    }

    case "SigningSlot":
      return "/firmas";

    case "Message":
      return "/mensajes";

    default:
      return null;
  }
}

export async function createNotificationInternal(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  referenceType?: string,
  referenceId?: string
) {
  await notificationModel.create({
    userId,
    type,
    title,
    body,
    referenceType: referenceType ?? null,
    referenceId: referenceId ?? null,
  });
}
