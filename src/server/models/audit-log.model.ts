import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";

interface FindAllParams {
  search?: string;
  entity?: string;
  userId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const auditLogModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.AuditLogWhereInput = {};

    if (params?.entity) where.entity = params.entity;
    if (params?.userId) where.userId = params.userId;

    if (params?.dateFrom || params?.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo) where.createdAt.lte = params.dateTo;
    }

    if (params?.search) {
      where.OR = [
        { entity: { contains: params.search, mode: "insensitive" } },
        { entityId: { contains: params.search, mode: "insensitive" } },
        { action: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },

  async create(data: Prisma.AuditLogUncheckedCreateInput) {
    return prisma.auditLog.create({ data });
  },

  async findByEntity(entity: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entity, entityId },
      include: {
        user: { select: { id: true, name: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  },
};
