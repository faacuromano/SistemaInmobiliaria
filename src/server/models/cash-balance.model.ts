import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";

interface FindAllParams {
  developmentId?: string;
  year?: number;
}

export const cashBalanceModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.CashBalanceWhereInput = {};

    if (params?.developmentId) where.developmentId = params.developmentId;
    if (params?.year) where.year = params.year;

    return prisma.cashBalance.findMany({
      where,
      include: {
        development: { select: { id: true, name: true } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  },

  async findByDevelopmentAndPeriod(
    developmentId: string,
    month: number,
    year: number
  ) {
    return prisma.cashBalance.findFirst({
      where: {
        developmentId,
        month,
        year,
      },
      include: {
        development: { select: { id: true, name: true } },
      },
    });
  },

  async upsert(data: {
    developmentId: string | null;
    month: number;
    year: number;
    arsBalance: number;
    usdBalance: number;
  }) {
    // Find existing record for this development+month+year
    const existing = await prisma.cashBalance.findFirst({
      where: {
        developmentId: data.developmentId,
        month: data.month,
        year: data.year,
      },
    });

    if (existing) {
      return prisma.cashBalance.update({
        where: { id: existing.id },
        data: {
          arsBalance: data.arsBalance,
          usdBalance: data.usdBalance,
          closedAt: new Date(),
        },
      });
    }

    return prisma.cashBalance.create({
      data: {
        developmentId: data.developmentId,
        month: data.month,
        year: data.year,
        arsBalance: data.arsBalance,
        usdBalance: data.usdBalance,
        closedAt: new Date(),
      },
    });
  },

  async calculateFromMovements(
    developmentId: string | null,
    month: number,
    year: number
  ) {
    // Build date range for the given month/year
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await prisma.cashMovement.aggregate({
      where: {
        developmentId: developmentId ?? null,
        date: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      _sum: {
        arsIncome: true,
        arsExpense: true,
        usdIncome: true,
        usdExpense: true,
      },
    });

    const arsIncome = Number(result._sum.arsIncome ?? 0);
    const arsExpense = Number(result._sum.arsExpense ?? 0);
    const usdIncome = Number(result._sum.usdIncome ?? 0);
    const usdExpense = Number(result._sum.usdExpense ?? 0);

    return {
      usdIncome,
      usdExpense,
      arsIncome,
      arsExpense,
      usdBalance: usdIncome - usdExpense,
      arsBalance: arsIncome - arsExpense,
    };
  },
};
