import { prisma } from "@/lib/prisma";
import type { Currency } from "@/generated/prisma/client/client";

export const extraChargeModel = {
  async findBySaleId(saleId: string) {
    return prisma.extraCharge.findMany({
      where: { saleId },
      orderBy: { dueDate: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.extraCharge.findUnique({
      where: { id },
      include: {
        sale: true,
        createdBy: { select: { id: true, name: true } },
      },
    });
  },

  async create(data: {
    saleId: string;
    description: string;
    amount: number;
    currency: Currency;
    dueDate: Date;
    notes?: string;
    isInKind?: boolean;
    inKindType?: string | null;
    status?: "PENDIENTE" | "PAGADA";
    paidAmount?: number;
    paidDate?: Date;
    createdById: string;
  }) {
    return prisma.extraCharge.create({ data });
  },

  async update(
    id: string,
    data: {
      description?: string;
      amount?: number;
      currency?: Currency;
      dueDate?: Date;
      notes?: string;
    }
  ) {
    return prisma.extraCharge.update({
      where: { id },
      data,
    });
  },

  async delete(id: string) {
    return prisma.extraCharge.delete({
      where: { id },
    });
  },
};
