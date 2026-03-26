"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guard";
import { messageModel } from "@/server/models/message.model";
import { userModel } from "@/server/models/user.model";
import { createNotificationInternal } from "@/server/actions/notification.actions";
import type { ActionResult } from "@/types/actions";
import { z } from "zod";

const sendMessageSchema = z.object({
  subject: z.string().min(1, "El asunto es requerido").max(200),
  body: z.string().min(1, "El mensaje es requerido"),
  recipientIds: z
    .array(z.string().min(1))
    .min(1, "Selecciona al menos un destinatario"),
});

export async function getMyMessages() {
  const session = await requireAuth();
  return messageModel.findReceivedByUserId(session.user.id);
}

export async function getSentMessages() {
  const session = await requireAuth();
  return messageModel.findBySenderId(session.user.id);
}

export async function sendMessage(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAuth();

  const raw = {
    subject: formData.get("subject"),
    body: formData.get("body"),
    recipientIds: formData.getAll("recipientIds"),
  };

  const parsed = sendMessageSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const message = await messageModel.create({
    senderId: session.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    recipientIds: parsed.data.recipientIds,
  });

  // Create a notification for each recipient
  const senderName = session.user.name ?? "Usuario";
  for (const recipientId of parsed.data.recipientIds) {
    await createNotificationInternal(
      recipientId,
      "SISTEMA",
      "Nuevo mensaje",
      `${senderName} te envio un mensaje: ${parsed.data.subject}`,
      "Message",
      message.id
    );
  }

  revalidatePath("/mensajes");
  return { success: true };
}

export async function markMessageRead(messageId: string) {
  const session = await requireAuth();
  await messageModel.markAsRead(messageId, session.user.id);
  revalidatePath("/mensajes");
  return { success: true as const };
}

export async function getUnreadMessageCount() {
  const session = await requireAuth();
  return messageModel.countUnread(session.user.id);
}

/**
 * Get active users for the message recipient selector.
 * Any authenticated user can see the list of active users for messaging.
 */
export async function getActiveUsersForMessaging() {
  await requireAuth();
  return userModel.findActiveForMessaging();
}
