import { prisma } from "@/lib/prisma";
import { Prisma, type SaleStatus } from "@/generated/prisma/client/client";

interface FindAllParams {
  search?: string;
  status?: SaleStatus;
  developmentId?: string;
  sellerId?: string;
}

export const saleModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.SaleWhereInput = {};

    if (params?.search) {
      where.OR = [
        { person: { firstName: { contains: params.search, mode: "insensitive" } } },
        { person: { lastName: { contains: params.search, mode: "insensitive" } } },
        { lot: { lotNumber: { contains: params.search, mode: "insensitive" } } },
      ];
    }
    if (params?.status) where.status = params.status;
    if (params?.developmentId) where.lot = { developmentId: params.developmentId };
    if (params?.sellerId) where.sellerId = params.sellerId;

    return prisma.sale.findMany({
      where,
      include: {
        lot: { include: { development: { select: { name: true, slug: true } } } },
        person: { select: { id: true, firstName: true, lastName: true } },
        seller: { select: { id: true, name: true, lastName: true } },
        _count: { select: { installments: true } },
      },
      orderBy: { saleDate: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        lot: { include: { development: { select: { id: true, name: true, slug: true } } } },
        person: { select: { id: true, firstName: true, lastName: true, dni: true, phone: true, email: true } },
        seller: { select: { id: true, name: true, lastName: true } },
        installments: { orderBy: { installmentNumber: "asc" } },
        extraCharges: { orderBy: { dueDate: "asc" } },
      },
    });
  },

  async create(data: Prisma.SaleUncheckedCreateInput) {
    return prisma.sale.create({ data });
  },

  async updateStatus(id: string, status: SaleStatus) {
    return prisma.sale.update({ where: { id }, data: { status } });
  },

  async findActiveSaleForLot(lotId: string) {
    return prisma.sale.findUnique({
      where: { lotId },
      select: { id: true, status: true },
    });
  },
};
