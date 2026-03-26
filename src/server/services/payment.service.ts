import { prisma } from "@/lib/prisma";
import { recalculateInstallments } from "@/lib/installment-recalculator";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { generateReceipt } from "@/server/services/receipt.service";

// ---------------------------------------------------------------------------
// Signing Gate — warn (but allow) payments when signing is not completed
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PayInstallmentParams {
  installmentId: string;
  amount: number;
  currency: "USD" | "ARS";
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA";
  bankAccountId?: string | null;
  manualRate?: number | null;
  notes?: string | null;
  date: Date;
  userId: string;
}

interface PayExtraChargeParams {
  extraChargeId: string;
  amount: number;
  currency: "USD" | "ARS";
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA";
  bankAccountId?: string | null;
  manualRate?: number | null;
  notes?: string | null;
  date: Date;
  userId: string;
}

interface RecordDeliveryParams {
  saleId: string;
  amount: number;
  currency: "USD" | "ARS";
  paymentMethod?: "EFECTIVO" | "TRANSFERENCIA";
  bankAccountId?: string | null;
  manualRate?: number | null;
  notes?: string | null;
  date: Date;
  userId: string;
}

// ---------------------------------------------------------------------------
// Pay Installment
// ---------------------------------------------------------------------------

export async function payInstallment(params: PayInstallmentParams): Promise<void> {
  const { installmentId, amount, currency, paymentMethod, bankAccountId, manualRate, notes, date, userId } = params;

  let cashMovementId: string | null = null;
  let saleId: string;

  try {
    // All reads + writes inside transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch installment with lock (read inside tx for consistency)
      const installment = await tx.installment.findUnique({
        where: { id: installmentId },
        include: {
          sale: {
            include: {
              lot: { select: { lotNumber: true, developmentId: true } },
            },
          },
        },
      });

      if (!installment) throw new ServiceError("Cuota no encontrada");
      if (
        installment.status !== "PENDIENTE" &&
        installment.status !== "PARCIAL" &&
        installment.status !== "VENCIDA"
      ) {
        throw new ServiceError("La cuota ya fue pagada o no esta pendiente");
      }

      // Validate payment does not exceed remaining balance (round to avoid floating-point drift)
      const remaining = Math.round((Number(installment.amount) - Number(installment.paidAmount)) * 100) / 100;
      if (Math.round(amount * 100) / 100 > remaining) {
        throw new ServiceError(
          `El monto (${amount}) supera el saldo pendiente de la cuota (${remaining.toFixed(2)})`
        );
      }

      const lotNumber = installment.sale.lot.lotNumber;
      const personId = installment.sale.personId;

      // 2. Create CashMovement
      const isUSD = currency === "USD";
      const cm = await tx.cashMovement.create({
        data: {
          saleId: installment.saleId,
          installmentId,
          personId,
          developmentId: installment.sale.lot.developmentId,
          date,
          type: "CUOTA",
          paymentMethod: paymentMethod ?? null,
          bankAccountId: paymentMethod === "TRANSFERENCIA" ? (bankAccountId ?? null) : null,
          concept: `CUOTA ${installment.installmentNumber} - LOTE ${lotNumber}`,
          detail: notes || null,
          usdIncome: isUSD ? amount : null,
          arsIncome: !isUSD ? amount : null,
          usdExpense: null,
          arsExpense: null,
          manualRate: manualRate ?? null,
          registeredById: userId,
          notes: notes || null,
        },
      });

      // 3. Update installment
      const newPaidAmount = Math.round((Number(installment.paidAmount) + amount) * 100) / 100;
      const isFullyPaid = newPaidAmount >= Math.round(Number(installment.amount) * 100) / 100;

      await tx.installment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: date,
          paidInCurrency: currency,
          status: isFullyPaid ? "PAGADA" : "PARCIAL",
        },
      });

      // 4. Check if all installments are PAGADA → complete sale
      if (isFullyPaid) {
        const allInstallments = await tx.installment.findMany({
          where: { saleId: installment.saleId },
          select: { id: true, status: true },
        });

        const allPaid = allInstallments.every((inst) =>
          inst.id === installmentId ? true : inst.status === "PAGADA"
        );

        if (allPaid) {
          await tx.sale.update({
            where: { id: installment.saleId },
            data: { status: "COMPLETADA" },
          });
        }
      }

      return { cashMovementId: cm.id, saleId: installment.saleId };
    });

    cashMovementId = result.cashMovementId;
    saleId = result.saleId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error al procesar pago de cuota:", error);
    throw new ServiceError("Error al procesar el pago");
  }

  // Auto-generate receipt (outside transaction — failure should not roll back payment)
  if (cashMovementId) {
    try {
      await generateReceipt(cashMovementId, userId);
    } catch (error) {
      console.error("Error al generar recibo automatico:", error);
    }
  }

  await logAction(
    "Installment",
    installmentId,
    "UPDATE",
    { newData: { action: "PAGO_CUOTA", amount, currency, saleId } },
    userId
  );
}

// ---------------------------------------------------------------------------
// Pay Extra Charge
// ---------------------------------------------------------------------------

export async function payExtraCharge(params: PayExtraChargeParams): Promise<void> {
  const { extraChargeId, amount, currency, paymentMethod, bankAccountId, manualRate, notes, date, userId } = params;

  let cashMovementId: string | null = null;
  let saleId: string;

  try {
    // All reads + writes + recalculation inside transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch extra charge with lock (read inside tx for consistency)
      const extraCharge = await tx.extraCharge.findUnique({
        where: { id: extraChargeId },
        include: {
          sale: {
            include: {
              lot: { select: { lotNumber: true, developmentId: true } },
            },
          },
        },
      });

      if (!extraCharge) throw new ServiceError("Cargo extra no encontrado");
      if (
        extraCharge.status !== "PENDIENTE" &&
        extraCharge.status !== "PARCIAL" &&
        extraCharge.status !== "VENCIDA"
      ) {
        throw new ServiceError("El cargo extra ya fue pagado o no esta pendiente");
      }

      // Validate payment does not exceed remaining balance (round to avoid floating-point drift)
      const remaining = Math.round((Number(extraCharge.amount) - Number(extraCharge.paidAmount)) * 100) / 100;
      if (Math.round(amount * 100) / 100 > remaining) {
        throw new ServiceError(
          `El monto (${amount}) supera el saldo pendiente del refuerzo (${remaining.toFixed(2)})`
        );
      }

      const developmentId = extraCharge.sale.lot.developmentId;
      const personId = extraCharge.sale.personId;

      // 2. Create CashMovement
      const isUSD = currency === "USD";
      const cm = await tx.cashMovement.create({
        data: {
          saleId: extraCharge.saleId,
          extraChargeId,
          personId,
          developmentId,
          date,
          type: "CUOTA",
          paymentMethod: paymentMethod ?? null,
          bankAccountId: paymentMethod === "TRANSFERENCIA" ? (bankAccountId ?? null) : null,
          concept: `REFUERZO - ${extraCharge.description}`,
          detail: notes || null,
          usdIncome: isUSD ? amount : null,
          arsIncome: !isUSD ? amount : null,
          usdExpense: null,
          arsExpense: null,
          manualRate: manualRate ?? null,
          registeredById: userId,
          notes: notes || null,
        },
      });

      // 3. Update extra charge
      const newPaidAmount = Math.round((Number(extraCharge.paidAmount) + amount) * 100) / 100;
      const isFullyPaid = newPaidAmount >= Math.round(Number(extraCharge.amount) * 100) / 100;

      await tx.extraCharge.update({
        where: { id: extraChargeId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: date,
          status: isFullyPaid ? "PAGADA" : "PARCIAL",
        },
      });

      // 4. If fully paid, recalculate pending installments INSIDE transaction
      if (isFullyPaid) {
        await recalculateInstallments(extraCharge.saleId, Number(extraCharge.amount), tx);
      }

      return { cashMovementId: cm.id, saleId: extraCharge.saleId };
    });

    cashMovementId = result.cashMovementId;
    saleId = result.saleId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error al procesar pago de cargo extra:", error);
    throw new ServiceError("Error al procesar el pago");
  }

  // Auto-generate receipt (outside transaction)
  if (cashMovementId) {
    try {
      await generateReceipt(cashMovementId, userId);
    } catch (error) {
      console.error("Error al generar recibo automatico:", error);
    }
  }

  await logAction(
    "ExtraCharge",
    extraChargeId,
    "UPDATE",
    { newData: { action: "PAGO_REFUERZO", amount, currency, saleId } },
    userId
  );
}

// ---------------------------------------------------------------------------
// Record Delivery Payment
// ---------------------------------------------------------------------------

export async function recordDeliveryPayment(params: RecordDeliveryParams): Promise<void> {
  const { saleId, amount, currency, paymentMethod, bankAccountId, manualRate, notes, date, userId } = params;

  // Fetch sale with lot context
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      lot: { select: { lotNumber: true, developmentId: true } },
    },
  });

  if (!sale) throw new ServiceError("Venta no encontrada");

  try {
    const isUSD = currency === "USD";
    await prisma.cashMovement.create({
      data: {
        saleId,
        personId: sale.personId,
        developmentId: sale.lot.developmentId,
        date,
        type: "ENTREGA",
        paymentMethod: paymentMethod ?? null,
        bankAccountId: paymentMethod === "TRANSFERENCIA" ? (bankAccountId ?? null) : null,
        concept: `ENTREGA - LOTE ${sale.lot.lotNumber}`,
        detail: notes || null,
        usdIncome: isUSD ? amount : null,
        arsIncome: !isUSD ? amount : null,
        usdExpense: null,
        arsExpense: null,
        manualRate: manualRate ?? null,
        registeredById: userId,
        notes: notes || null,
      },
    });
  } catch (error) {
    console.error("Error al registrar pago de entrega:", error);
    throw new ServiceError("Error al registrar el pago de entrega");
  }

  await logAction(
    "Sale",
    saleId,
    "UPDATE",
    { newData: { action: "PAGO_ENTREGA", amount, currency } },
    userId
  );
}
