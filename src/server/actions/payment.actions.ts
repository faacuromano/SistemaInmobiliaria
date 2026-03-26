"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import * as paymentService from "@/server/services/payment.service";
import {
  payInstallmentSchema,
  payExtraChargeSchema,
  recordDeliveryPaymentSchema,
} from "@/schemas/payment.schema";
import type { ActionResult } from "@/types/actions";

// ---------------------------------------------------------------------------
// 1. Pay Installment
// ---------------------------------------------------------------------------

export async function payInstallment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  const raw = {
    installmentId: formData.get("installmentId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || "EFECTIVO",
    bankAccountId: formData.get("bankAccountId") || null,
    manualRate: formData.get("manualRate") || null,
    notes: formData.get("notes") || null,
    date: formData.get("date"),
  };

  const parsed = payInstallmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await paymentService.payInstallment({
      installmentId: parsed.data.installmentId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      bankAccountId: parsed.data.bankAccountId ?? null,
      manualRate: parsed.data.manualRate ?? null,
      notes: parsed.data.notes ?? null,
      date: parsed.data.date,
      userId: session.user.id,
    });

    revalidatePath("/ventas");
    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al procesar el pago" };
  }
}

// ---------------------------------------------------------------------------
// 2. Pay Extra Charge
// ---------------------------------------------------------------------------

export async function payExtraCharge(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  const raw = {
    extraChargeId: formData.get("extraChargeId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || "EFECTIVO",
    bankAccountId: formData.get("bankAccountId") || null,
    manualRate: formData.get("manualRate") || null,
    notes: formData.get("notes") || null,
    date: formData.get("date"),
  };

  const parsed = payExtraChargeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await paymentService.payExtraCharge({
      extraChargeId: parsed.data.extraChargeId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      bankAccountId: parsed.data.bankAccountId ?? null,
      manualRate: parsed.data.manualRate ?? null,
      notes: parsed.data.notes ?? null,
      date: parsed.data.date,
      userId: session.user.id,
    });

    revalidatePath("/ventas");
    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al procesar el pago" };
  }
}

// ---------------------------------------------------------------------------
// 3. Record Delivery Payment
// ---------------------------------------------------------------------------

export async function recordDeliveryPayment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  const raw = {
    saleId: formData.get("saleId"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    paymentMethod: formData.get("paymentMethod") || "EFECTIVO",
    bankAccountId: formData.get("bankAccountId") || null,
    manualRate: formData.get("manualRate") || null,
    notes: formData.get("notes") || null,
    date: formData.get("date"),
  };

  const parsed = recordDeliveryPaymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await paymentService.recordDeliveryPayment({
      saleId: parsed.data.saleId,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      bankAccountId: parsed.data.bankAccountId ?? null,
      manualRate: parsed.data.manualRate ?? null,
      notes: parsed.data.notes ?? null,
      date: parsed.data.date,
      userId: session.user.id,
    });

    revalidatePath("/ventas");
    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al registrar el pago de entrega" };
  }
}
