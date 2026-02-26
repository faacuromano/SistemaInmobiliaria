import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client/client";

interface FindByUserIdParams {
  read?: boolean;
  limit?: number;
}

export const notificationModel = {
  async findByUserId(userId: string, params?: FindByUserIdParams) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(params?.read !== undefined ? { read: params.read } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params?.limit ?? 50,
    });
  },

  async countUnread(userId: string) {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  },

  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    referenceType?: string | null;
    referenceId?: string | null;
  }) {
    return prisma.notification.create({ data });
  },

  async findById(id: string) {
    return prisma.notification.findUnique({ where: { id } });
  },

  async markAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  },

  async createForAllUsers(data: {
    type: NotificationType;
    title: string;
    body: string;
    referenceType?: string | null;
    referenceId?: string | null;
  }) {
    const activeUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    return prisma.notification.createMany({
      data: activeUsers.map((user) => ({
        userId: user.id,
        type: data.type,
        title: data.title,
        body: data.body,
        referenceType: data.referenceType ?? null,
        referenceId: data.referenceId ?? null,
      })),
    });
  },
};
