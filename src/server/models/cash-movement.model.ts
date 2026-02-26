import { prisma } from "@/lib/prisma";
import { Prisma, type MovementType } from "@/generated/prisma/client/client";

interface FindAllParams {
  dateFrom?: Date;
  dateTo?: Date;
  type?: MovementType;
  developmentId?: string;
  saleId?: string;
  search?: string;
}

interface SummaryParams {
  dateFrom?: Date;
  dateTo?: Date;
  developmentId?: string;
}

export const cashMovementModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.CashMovementWhereInput = {};

    if (params?.dateFrom || params?.dateTo) {
      where.date = {};
      if (params.dateFrom) where.date.gte = params.dateFrom;
      if (params.dateTo) where.date.lte = params.dateTo;
    }
    if (params?.type) where.type = params.type;
    if (params?.developmentId) where.developmentId = params.developmentId;
    if (params?.saleId) where.saleId = params.saleId;
    if (params?.search) {
      where.concept = { contains: params.search, mode: "insensitive" };
    }

    return prisma.cashMovement.findMany({
      where,
      include: {
        development: { select: { name: true } },
        person: { select: { firstName: true, lastName: true } },
        sale: { select: { id: true } },
        registeredBy: { select: { name: true } },
        installment: { select: { installmentNumber: true } },
        extraCharge: { select: { description: true } },
      },
      orderBy: { date: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.cashMovement.findUnique({
      where: { id },
      include: {
        development: true,
        person: true,
        sale: { include: { lot: true } },
        installment: true,
        extraCharge: true,
        exchangeRate: true,
        registeredBy: { select: { id: true, name: true } },
        receipt: true,
      },
    });
  },

  async findBySaleId(saleId: string) {
    return prisma.cashMovement.findMany({
      where: { saleId },
      orderBy: { date: "desc" },
    });
  },

  async create(data: Prisma.CashMovementUncheckedCreateInput) {
    return prisma.cashMovement.create({ data });
  },

  async getSummary(params?: SummaryParams) {
    const where: Prisma.CashMovementWhereInput = {};

    if (params?.dateFrom || params?.dateTo) {
      where.date = {};
      if (params.dateFrom) where.date.gte = params.dateFrom;
      if (params.dateTo) where.date.lte = params.dateTo;
    }
    if (params?.developmentId) where.developmentId = params.developmentId;

    const result = await prisma.cashMovement.aggregate({
      where,
      _sum: {
        arsIncome: true,
        arsExpense: true,
        usdIncome: true,
        usdExpense: true,
      },
    });

    return {
      arsIncome: result._sum.arsIncome,
      arsExpense: result._sum.arsExpense,
      usdIncome: result._sum.usdIncome,
      usdExpense: result._sum.usdExpense,
    };
  },
};
