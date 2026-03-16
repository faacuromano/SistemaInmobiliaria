import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";

interface FindAllParams {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  developmentId?: string;
  sellerId?: string;
  search?: string;
}

const includeBase = {
  development: { select: { name: true } },
  seller: { select: { name: true, lastName: true } },
  createdBy: { select: { name: true } },
  sale: {
    select: {
      id: true,
      status: true,
      person: { select: { firstName: true, lastName: true } },
      lot: { select: { lotNumber: true } },
    },
  },
} satisfies Prisma.SigningSlotInclude;

export const signingModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.SigningSlotWhereInput = {};

    if (params?.dateFrom || params?.dateTo) {
      where.date = {};
      if (params.dateFrom) where.date.gte = params.dateFrom;
      if (params.dateTo) where.date.lte = params.dateTo;
    }

    if (params?.status) {
      where.status = params.status as Prisma.EnumSigningStatusFilter["equals"];
    }

    if (params?.developmentId) {
      where.developmentId = params.developmentId;
    }

    if (params?.sellerId) {
      where.sellerId = params.sellerId;
    }

    if (params?.search) {
      where.OR = [
        { clientName: { contains: params.search, mode: "insensitive" } },
        { lotInfo: { contains: params.search, mode: "insensitive" } },
        { lotNumbers: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return prisma.signingSlot.findMany({
      where,
      include: includeBase,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  },

  async findById(id: string) {
    return prisma.signingSlot.findUnique({
      where: { id },
      include: includeBase,
    });
  },

  async findByDateRange(from: Date, to: Date) {
    return prisma.signingSlot.findMany({
      where: {
        date: { gte: from, lte: to },
      },
      include: includeBase,
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });
  },

  async create(data: {
    date: Date;
    time: string;
    endTime?: string | null;
    lotInfo: string;
    clientName?: string | null;
    lotNumbers?: string | null;
    developmentId?: string | null;
    sellerId?: string | null;
    notes?: string | null;
    createdById?: string | null;
    saleId?: string | null;
  }) {
    return prisma.signingSlot.create({
      data,
      include: includeBase,
    });
  },

  async update(
    id: string,
    data: {
      date?: Date;
      time?: string;
      endTime?: string | null;
      lotInfo?: string;
      clientName?: string | null;
      lotNumbers?: string | null;
      developmentId?: string | null;
      sellerId?: string | null;
      status?: string;
      notes?: string | null;
      saleId?: string | null;
    }
  ) {
    return prisma.signingSlot.update({
      where: { id },
      data: data as Prisma.SigningSlotUpdateInput,
      include: includeBase,
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.signingSlot.update({
      where: { id },
      data: { status: status as Prisma.EnumSigningStatusFieldUpdateOperationsInput["set"] },
      include: includeBase,
    });
  },

  async delete(id: string) {
    return prisma.signingSlot.delete({
      where: { id },
    });
  },
};
