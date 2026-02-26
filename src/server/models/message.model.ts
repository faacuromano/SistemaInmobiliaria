import { prisma } from "@/lib/prisma";

export const messageModel = {
  async findBySenderId(senderId: string) {
    return prisma.message.findMany({
      where: { senderId },
      include: {
        sender: { select: { id: true, name: true, lastName: true } },
        recipients: {
          include: {
            user: { select: { id: true, name: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findReceivedByUserId(userId: string) {
    return prisma.messageRecipient.findMany({
      where: { userId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, name: true, lastName: true } },
            recipients: {
              include: {
                user: { select: { id: true, name: true, lastName: true } },
              },
            },
          },
        },
      },
      orderBy: { message: { createdAt: "desc" } },
    });
  },

  async findById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, lastName: true } },
        recipients: {
          include: {
            user: { select: { id: true, name: true, lastName: true } },
          },
        },
      },
    });
  },

  async create(data: {
    senderId: string;
    subject: string | null;
    body: string;
    recipientIds: string[];
  }) {
    return prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          senderId: data.senderId,
          subject: data.subject,
          body: data.body,
          recipients: {
            create: data.recipientIds.map((userId) => ({ userId })),
          },
        },
        include: {
          sender: { select: { id: true, name: true, lastName: true } },
          recipients: {
            include: {
              user: { select: { id: true, name: true, lastName: true } },
            },
          },
        },
      });
      return message;
    });
  },

  async markAsRead(messageId: string, userId: string) {
    return prisma.messageRecipient.updateMany({
      where: { messageId, userId, readAt: null },
      data: { readAt: new Date() },
    });
  },

  async countUnread(userId: string) {
    return prisma.messageRecipient.count({
      where: { userId, readAt: null },
    });
  },
};
