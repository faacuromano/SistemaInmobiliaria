import { prisma } from "@/lib/prisma";
import { Prisma, type LotStatus } from "@/generated/prisma/client/client";

interface FindByDevelopmentParams {
  search?: string;
  status?: LotStatus;
}

export const lotModel = {
  async findByDevelopmentId(developmentId: string, params?: FindByDevelopmentParams) {
    const where: Prisma.LotWhereInput = { developmentId };

    if (params?.search) {
      where.OR = [
        { lotNumber: { contains: params.search, mode: "insensitive" } },
        { block: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.status) where.status = params.status;

    return prisma.lot.findMany({
      where,
      include: {
        sale: { include: { person: { select: { firstName: true, lastName: true } } } },
        tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
      },
      orderBy: { lotNumber: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.lot.findUnique({
      where: { id },
      include: {
        sale: { include: { person: true } },
        development: true,
        tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
      },
    });
  },

  async create(data: {
    developmentId: string;
    lotNumber: string;
    block?: string | null;
    area?: number | null;
    listPrice?: number | null;
    status: LotStatus;
    notes?: string | null;
  }) {
    return prisma.lot.create({ data });
  },

  async update(id: string, data: {
    lotNumber?: string;
    block?: string | null;
    area?: number | null;
    listPrice?: number | null;
    status?: LotStatus;
    notes?: string | null;
  }) {
    return prisma.lot.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.lot.delete({ where: { id } });
  },

  async lotNumberExists(developmentId: string, lotNumber: string, excludeId?: string) {
    const lot = await prisma.lot.findUnique({
      where: { developmentId_lotNumber: { developmentId, lotNumber } },
    });
    if (!lot) return false;
    return excludeId ? lot.id !== excludeId : true;
  },

  async hasSale(id: string) {
    const lot = await prisma.lot.findUnique({
      where: { id },
      include: { sale: { select: { id: true } } },
    });
    return !!lot?.sale;
  },

  async countWithSales(ids: string[]) {
    return prisma.lot.count({
      where: { id: { in: ids }, sale: { isNot: null } },
    });
  },

  async bulkUpdateStatus(ids: string[], status: LotStatus) {
    return prisma.lot.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  },
};
