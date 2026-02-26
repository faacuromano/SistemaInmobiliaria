import { prisma } from "@/lib/prisma";

export const cronModel = {
  /**
   * Find extra charges due within the next N days that haven't been notified yet.
   * Only returns PENDIENTE charges where notified = false.
   */
  async findUpcomingExtraCharges(daysAhead: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    return prisma.extraCharge.findMany({
      where: {
        status: "PENDIENTE",
        notified: false,
        dueDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        sale: {
          include: {
            person: true,
            lot: {
              include: {
                development: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  },

  /**
   * Mark an extra charge as notified so it won't be picked up again.
   */
  async markExtraChargeNotified(id: string) {
    return prisma.extraCharge.update({
      where: { id },
      data: { notified: true },
    });
  },

  /**
   * Find installments that are overdue (dueDate < today) and still PENDIENTE.
   * Uses a simple heuristic: looks for installments whose dueDate is in the past
   * (up to 30 days ago to avoid processing ancient records) that are still PENDIENTE.
   *
   * We check that no notification of type CUOTA_VENCIDA already exists for each
   * installment to avoid duplicates — this is handled in the cron route itself.
   */
  async findOverdueInstallments() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return prisma.installment.findMany({
      where: {
        status: "PENDIENTE",
        dueDate: {
          lt: today,
          gte: thirtyDaysAgo,
        },
      },
      include: {
        sale: {
          include: {
            person: true,
            lot: {
              include: {
                development: true,
              },
            },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  },

  /**
   * Check if a CUOTA_VENCIDA notification already exists for a given installment.
   * Used to prevent duplicate overdue notifications.
   */
  async hasOverdueNotification(installmentId: string) {
    const existing = await prisma.notification.findFirst({
      where: {
        referenceType: "Installment",
        referenceId: installmentId,
        type: "CUOTA_VENCIDA",
      },
    });
    return !!existing;
  },

  /**
   * Find signing slots scheduled within the next N days.
   * Only returns PENDIENTE or CONFIRMADA signings.
   */
  async findUpcomingSignings(daysAhead: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    return prisma.signingSlot.findMany({
      where: {
        date: {
          gte: today,
          lte: futureDate,
        },
        status: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      include: {
        development: true,
        seller: true,
      },
      orderBy: { date: "asc" },
    });
  },

  /**
   * Check if a FIRMA_PROXIMA notification already exists for a given signing slot.
   * Used to prevent duplicate signing notifications.
   */
  async hasSigningNotification(signingId: string) {
    const existing = await prisma.notification.findFirst({
      where: {
        referenceType: "SigningSlot",
        referenceId: signingId,
        type: "FIRMA_PROXIMA",
      },
    });
    return !!existing;
  },
};
