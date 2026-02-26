import { prisma } from "@/lib/prisma";

export const exchangeRateModel = {
  async findByDate(date: Date) {
    // Normalize to start/end of day for comparison
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return prisma.exchangeRate.findFirst({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });
  },

  async findLatest() {
    return prisma.exchangeRate.findFirst({
      orderBy: { date: "desc" },
    });
  },

  async findByDateRange(from: Date, to: Date) {
    return prisma.exchangeRate.findMany({
      where: {
        date: {
          gte: from,
          lte: to,
        },
      },
      orderBy: { date: "desc" },
    });
  },

  async upsertByDate(
    date: Date,
    data: {
      source?: string;
      officialBuy?: number | null;
      officialSell?: number | null;
      blueBuy?: number | null;
      blueSell?: number | null;
      cryptoBuy?: number | null;
      cryptoSell?: number | null;
    }
  ) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    // Check if a rate already exists for this day
    const existing = await this.findByDate(date);

    if (existing) {
      return prisma.exchangeRate.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.exchangeRate.create({
      data: {
        date: startOfDay,
        ...data,
      },
    });
  },
};
