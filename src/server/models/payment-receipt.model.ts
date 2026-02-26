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

  async generateReceiptNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `REC-${year}${month}-`;

    // Find the latest receipt for the current month
    const latest = await prisma.paymentReceipt.findFirst({
      where: {
        receiptNumber: { startsWith: prefix },
      },
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true },
    });

    let nextNumber = 1;
    if (latest) {
      // Extract the counter from e.g. "REC-202602-0042"
      const parts = latest.receiptNumber.split("-");
      const lastCounter = parseInt(parts[2], 10);
      if (!isNaN(lastCounter)) {
        nextNumber = lastCounter + 1;
      }
    }

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
  },
};
