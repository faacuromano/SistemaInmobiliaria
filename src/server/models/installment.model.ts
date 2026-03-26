import { prisma } from "@/lib/prisma";
import type { Currency } from "@/generated/prisma/client/client";

interface InstallmentCreateData {
  saleId: string;
  installmentNumber: number;
  amount: number;
  currency: Currency;
  dueDate: Date;
  monthLabel: string;
}

export const installmentModel = {
  async createMany(data: InstallmentCreateData[]) {
    return prisma.installment.createMany({ data });
  },

  async findBySaleId(saleId: string) {
    return prisma.installment.findMany({
      where: { saleId },
      orderBy: { installmentNumber: "asc" },
    });
  },

  async findSaleIdById(id: string) {
    const row = await prisma.installment.findUnique({
      where: { id },
      select: { saleId: true },
    });
    return row?.saleId ?? null;
  },
};
