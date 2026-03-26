import { prisma } from "@/lib/prisma";
import { Prisma, DevelopmentStatus, DevelopmentType } from "@/generated/prisma/client/client";

interface FindAllParams {
  search?: string;
  status?: DevelopmentStatus;
  type?: DevelopmentType;
}

export const developmentModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.DevelopmentWhereInput = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { location: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.status) where.status = params.status;
    if (params?.type) where.type = params.type;

    return prisma.development.findMany({
      where,
      include: {
        _count: { select: { lots: true } },
        lots: {
          where: { sale: { isNot: null } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findAllIds() {
    return prisma.development.findMany({
      select: { id: true },
    });
  },

  async findOptions() {
    return prisma.development.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.development.findUnique({
      where: { id },
      include: { lots: { orderBy: { lotNumber: "asc" } } },
    });
  },

  async findBySlug(slug: string) {
    return prisma.development.findUnique({
      where: { slug },
      include: {
        lots: {
          include: {
            sale: { include: { person: true } },
            tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
          },
          orderBy: { lotNumber: "asc" },
        },
        _count: { select: { lots: true } },
      },
    });
  },

  async create(data: {
    name: string;
    slug: string;
    description?: string | null;
    location?: string | null;
    googleMapsUrl?: string | null;
    type: DevelopmentType;
    status: DevelopmentStatus;
  }) {
    return prisma.development.create({ data });
  },

  async update(id: string, data: {
    name?: string;
    slug?: string;
    description?: string | null;
    location?: string | null;
    googleMapsUrl?: string | null;
    type?: DevelopmentType;
    status?: DevelopmentStatus;
  }) {
    return prisma.development.update({ where: { id }, data });
  },

  async delete(id: string) {
    // Nullify related entities, delete lots, then delete development
    await prisma.$transaction([
      prisma.cashMovement.updateMany({
        where: { developmentId: id },
        data: { developmentId: null },
      }),
      prisma.cashBalance.deleteMany({
        where: { developmentId: id },
      }),
      prisma.signingSlot.updateMany({
        where: { developmentId: id },
        data: { developmentId: null },
      }),
      prisma.lotTag.deleteMany({
        where: { lot: { developmentId: id } },
      }),
      prisma.lot.deleteMany({
        where: { developmentId: id },
      }),
      prisma.development.delete({ where: { id } }),
    ]);
  },

  async slugExists(slug: string, excludeId?: string) {
    const dev = await prisma.development.findUnique({ where: { slug } });
    if (!dev) return false;
    return excludeId ? dev.id !== excludeId : true;
  },

  async hasLotsWithSales(id: string) {
    const count = await prisma.lot.count({
      where: { developmentId: id, sale: { isNot: null } },
    });
    return count > 0;
  },
};
