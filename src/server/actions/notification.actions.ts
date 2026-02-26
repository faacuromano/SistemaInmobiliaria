"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-guard";
import { notificationModel } from "@/server/models/notification.model";
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

/**
 * Create a notification for a specific user.
 * Can be called internally by other server actions or by admins with config:manage.
 */
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

/**
 * Internal helper — create a notification without permission check.
 * For use within other server actions only.
 */
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
