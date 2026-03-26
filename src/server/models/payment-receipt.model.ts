import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";

interface FindAllParams {
  saleId?: string;
  personId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export const paymentReceiptModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.PaymentReceiptWhereInput = {};

    if (params?.saleId) where.saleId = params.saleId;
    if (params?.personId) where.personId = params.personId;
    if (params?.dateFrom || params?.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = params.dateFrom;
      if (params.dateTo) where.createdAt.lte = params.dateTo;
    }

    return prisma.paymentReceipt.findMany({
      where,
      include: {
        cashMovement: {
          select: {
            id: true,
            date: true,
            type: true,
            concept: true,
            usdIncome: true,
            arsIncome: true,
            usdExpense: true,
            arsExpense: true,
          },
        },
        sale: {
          select: {
            id: true,
            currency: true,
            lot: {
              select: {
                lotNumber: true,
                block: true,
                development: { select: { name: true } },
              },
            },
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
          },
        },
        generatedBy: {
          select: { id: true, name: true, lastName: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id: string) {
    return prisma.paymentReceipt.findUnique({
      where: { id },
      include: {
        cashMovement: {
          select: {
            id: true,
            date: true,
            type: true,
            concept: true,
            usdIncome: true,
            arsIncome: true,
            usdExpense: true,
            arsExpense: true,
            manualRate: true,
          },
        },
        sale: {
          select: {
            id: true,
            currency: true,
            lot: {
              select: {
                lotNumber: true,
                block: true,
                development: { select: { name: true } },
              },
            },
          },
        },
        person: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            phone: true,
            email: true,
          },
        },
        generatedBy: {
          select: { id: true, name: true, lastName: true },
        },
      },
    });
  },

  async findByCashMovementId(cashMovementId: string) {
    return prisma.paymentReceipt.findUnique({
      where: { cashMovementId },
    });
  },

  async create(data: Prisma.PaymentReceiptUncheckedCreateInput) {
    return prisma.paymentReceipt.create({ data });
  },

  /**
   * Generate a unique receipt number atomically using a raw query
   * to prevent race conditions on concurrent receipt generation.
   */
  async generateReceiptNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `REC-${year}${month}-`;

    // Use a single atomic query to find max and compute next number
    const result = await prisma.$queryRaw<
      { max_number: string | null }[]
    >`SELECT MAX("receipt_number") as max_number FROM "payment_receipts" WHERE "receipt_number" LIKE ${prefix + '%'}`;

    let nextNumber = 1;
    const maxNumber = result[0]?.max_number;
    if (maxNumber) {
      const parts = maxNumber.split("-");
      const lastCounter = parseInt(parts[2], 10);
      if (!isNaN(lastCounter)) {
        nextNumber = lastCounter + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  },
};
