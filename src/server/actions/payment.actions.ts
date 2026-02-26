"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { recalculateInstallments } from "@/lib/installment-recalculator";
import { generateReceipt } from "@/server/actions/payment-receipt.actions";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFormAmount(formData: FormData, field: string): number | null {
  const raw = formData.get(field);
  if (raw === null || raw === "") return null;
  const num = Number(raw);
  if (isNaN(num)) return null;
  return num;
}

function parseFormString(formData: FormData, field: string): string | null {
  const raw = formData.get(field);
  if (raw === null || raw === "") return null;
  return String(raw);
}

function parseFormDate(formData: FormData, field: string): Date {
  const raw = formData.get(field);
  if (raw) {
    const d = new Date(String(raw));
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

// ---------------------------------------------------------------------------
// 1. Pay Installment
// ---------------------------------------------------------------------------

export async function payInstallment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // --- Parse inputs ---
  const installmentId = parseFormString(formData, "installmentId");
  const amount = parseFormAmount(formData, "amount");
  const currency = parseFormString(formData, "currency");
  const manualRate = parseFormAmount(formData, "manualRate");
  const notes = parseFormString(formData, "notes");
  const date = parseFormDate(formData, "date");

  if (!installmentId) {
    return { success: false, error: "ID de cuota requerido" };
  }
  if (!amount || amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  if (!currency || (currency !== "USD" && currency !== "ARS")) {
    return { success: false, error: "Moneda invalida (USD o ARS)" };
  }

  // --- Fetch installment with sale + lot context ---
  const installment = await prisma.installment.findUnique({
    where: { id: installmentId },
    include: {
      sale: {
        include: {
          lot: { select: { lotNumber: true, developmentId: true } },
        },
      },
    },
  });

  if (!installment) {
    return { success: false, error: "Cuota no encontrada" };
  }
  if (installment.status !== "PENDIENTE" && installment.status !== "PARCIAL") {
    return { success: false, error: "La cuota ya fue pagada o no esta pendiente" };
  }

  // Validate payment does not exceed remaining balance
  const installmentRemaining = Number(installment.amount) - Number(installment.paidAmount);
  if (amount > installmentRemaining) {
    return {
      success: false,
      error: `El monto (${amount}) supera el saldo pendiente de la cuota (${installmentRemaining.toFixed(2)})`,
    };
  }

  const saleId = installment.saleId;
  const lotNumber = installment.sale.lot.lotNumber;
  const developmentId = installment.sale.lot.developmentId;
  const personId = installment.sale.personId;

  let cashMovementId: string | null = null;

  try {
    cashMovementId = await prisma.$transaction(async (tx) => {
      // 1. Create CashMovement
      const isUSD = currency === "USD";
      const cm = await tx.cashMovement.create({
        data: {
          saleId,
          installmentId,
          personId,
          developmentId,
          date,
          type: "CUOTA",
          concept: `CUOTA ${installment.installmentNumber} - LOTE ${lotNumber}`,
          detail: notes || null,
          usdIncome: isUSD ? amount : null,
          arsIncome: !isUSD ? amount : null,
          usdExpense: null,
          arsExpense: null,
          manualRate: manualRate ?? null,
          registeredById: session.user.id,
          notes: notes || null,
        },
      });

      // 2. Update installment
      const currentPaid = Number(installment.paidAmount);
      const newPaidAmount = currentPaid + amount;
      const installmentAmount = Number(installment.amount);
      const isFullyPaid = newPaidAmount >= installmentAmount;

      await tx.installment.update({
        where: { id: installmentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: date,
          paidInCurrency: currency,
          status: isFullyPaid ? "PAGADA" : "PARCIAL",
        },
      });

      // 3. Check if all installments of the sale are PAGADA → complete sale
      if (isFullyPaid) {
        const allInstallments = await tx.installment.findMany({
          where: { saleId },
          select: { id: true, status: true },
        });

        // The installment we just updated still shows old status in the query
        // so we check: all others must be PAGADA, and the one we just updated is now PAGADA
        const allPaid = allInstallments.every((inst) =>
          inst.id === installmentId ? true : inst.status === "PAGADA"
        );

        if (allPaid) {
          await tx.sale.update({
            where: { id: saleId },
            data: { status: "COMPLETADA" },
          });
        }
      }

      return cm.id;
    });
  } catch (error) {
    console.error("Error al procesar pago de cuota:", error);
    return { success: false, error: "Error al procesar el pago" };
  }

  // Auto-generate receipt (outside transaction — failure should not roll back payment)
  if (cashMovementId) {
    try {
      await generateReceipt(cashMovementId);
    } catch (error) {
      console.error("Error al generar recibo automatico:", error);
    }
  }

  await logAction("Installment", installmentId, "UPDATE", {
    newData: { action: "PAGO_CUOTA", amount, currency, saleId },
  }, session.user.id);

  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/caja");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 2. Pay Extra Charge
// ---------------------------------------------------------------------------

export async function payExtraCharge(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // --- Parse inputs ---
  const extraChargeId = parseFormString(formData, "extraChargeId");
  const amount = parseFormAmount(formData, "amount");
  const currency = parseFormString(formData, "currency");
  const manualRate = parseFormAmount(formData, "manualRate");
  const notes = parseFormString(formData, "notes");
  const date = parseFormDate(formData, "date");

  if (!extraChargeId) {
    return { success: false, error: "ID de cargo extra requerido" };
  }
  if (!amount || amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  if (!currency || (currency !== "USD" && currency !== "ARS")) {
    return { success: false, error: "Moneda invalida (USD o ARS)" };
  }

  // --- Fetch extra charge with sale + lot context ---
  const extraCharge = await prisma.extraCharge.findUnique({
    where: { id: extraChargeId },
    include: {
      sale: {
        include: {
          lot: { select: { lotNumber: true, developmentId: true } },
        },
      },
    },
  });

  if (!extraCharge) {
    return { success: false, error: "Cargo extra no encontrado" };
  }
  if (extraCharge.status !== "PENDIENTE" && extraCharge.status !== "PARCIAL") {
    return { success: false, error: "El cargo extra ya fue pagado o no esta pendiente" };
  }

  // Validate payment does not exceed remaining balance
  const chargeRemaining = Number(extraCharge.amount) - Number(extraCharge.paidAmount);
  if (amount > chargeRemaining) {
    return {
      success: false,
      error: `El monto (${amount}) supera el saldo pendiente del refuerzo (${chargeRemaining.toFixed(2)})`,
    };
  }

  const saleId = extraCharge.saleId;
  const developmentIdEC = extraCharge.sale.lot.developmentId;
  const personId = extraCharge.sale.personId;

  let cashMovementId: string | null = null;

  try {
    let becamePaid = false;

    cashMovementId = await prisma.$transaction(async (tx) => {
      // 1. Create CashMovement
      const isUSD = currency === "USD";
      const cm = await tx.cashMovement.create({
        data: {
          saleId,
          extraChargeId,
          personId,
          developmentId: developmentIdEC,
          date,
          type: "CUOTA",
          concept: `REFUERZO - ${extraCharge.description}`,
          detail: notes || null,
          usdIncome: isUSD ? amount : null,
          arsIncome: !isUSD ? amount : null,
          usdExpense: null,
          arsExpense: null,
          manualRate: manualRate ?? null,
          registeredById: session.user.id,
          notes: notes || null,
        },
      });

      // 2. Update extra charge
      const currentPaid = Number(extraCharge.paidAmount);
      const newPaidAmount = currentPaid + amount;
      const chargeAmount = Number(extraCharge.amount);
      const isFullyPaid = newPaidAmount >= chargeAmount;

      await tx.extraCharge.update({
        where: { id: extraChargeId },
        data: {
          paidAmount: newPaidAmount,
          paidDate: date,
          status: isFullyPaid ? "PAGADA" : "PARCIAL",
        },
      });

      becamePaid = isFullyPaid;

      return cm.id;
    });

    // 3. If fully paid, recalculate pending installments
    //    (runs outside the transaction since recalculateInstallments
    //     uses its own prisma.$transaction internally)
    if (becamePaid) {
      await recalculateInstallments(saleId, Number(extraCharge.amount));
    }
  } catch (error) {
    console.error("Error al procesar pago de cargo extra:", error);
    return { success: false, error: "Error al procesar el pago" };
  }

  // Auto-generate receipt (outside transaction — failure should not roll back payment)
  if (cashMovementId) {
    try {
      await generateReceipt(cashMovementId);
    } catch (error) {
      console.error("Error al generar recibo automatico:", error);
    }
  }

  await logAction("ExtraCharge", extraChargeId, "UPDATE", {
    newData: { action: "PAGO_REFUERZO", amount, currency, saleId },
  }, session.user.id);

  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/caja");
  return { success: true };
}

// ---------------------------------------------------------------------------
// 3. Record Delivery Payment
// ---------------------------------------------------------------------------

export async function recordDeliveryPayment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // --- Parse inputs ---
  const saleId = parseFormString(formData, "saleId");
  const amount = parseFormAmount(formData, "amount");
  const currency = parseFormString(formData, "currency");
  const manualRate = parseFormAmount(formData, "manualRate");
  const notes = parseFormString(formData, "notes");
  const date = parseFormDate(formData, "date");

  if (!saleId) {
    return { success: false, error: "ID de venta requerido" };
  }
  if (!amount || amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a 0" };
  }
  if (!currency || (currency !== "USD" && currency !== "ARS")) {
    return { success: false, error: "Moneda invalida (USD o ARS)" };
  }

  // --- Fetch sale with lot context ---
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      lot: { select: { lotNumber: true, developmentId: true } },
    },
  });

  if (!sale) {
    return { success: false, error: "Venta no encontrada" };
  }

  try {
    const isUSD = currency === "USD";
    await prisma.cashMovement.create({
      data: {
        saleId,
        personId: sale.personId,
        developmentId: sale.lot.developmentId,
        date,
        type: "ENTREGA",
        concept: `ENTREGA - LOTE ${sale.lot.lotNumber}`,
        detail: notes || null,
        usdIncome: isUSD ? amount : null,
        arsIncome: !isUSD ? amount : null,
        usdExpense: null,
        arsExpense: null,
        manualRate: manualRate ?? null,
        registeredById: session.user.id,
        notes: notes || null,
      },
    });
  } catch (error) {
    console.error("Error al registrar pago de entrega:", error);
    return { success: false, error: "Error al registrar el pago de entrega" };
  }

  await logAction("Sale", saleId, "UPDATE", {
    newData: { action: "PAGO_ENTREGA", amount, currency },
  }, session.user.id);

  revalidatePath(`/ventas/${saleId}`);
  revalidatePath("/caja");
  return { success: true };
}
