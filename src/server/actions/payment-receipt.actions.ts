"use server";

import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { serializeDecimals } from "@/lib/serialize";
import { paymentReceiptModel } from "@/server/models/payment-receipt.model";
import * as receiptService from "@/server/services/receipt.service";
import type { ActionResult } from "@/types/actions";

type ReceiptRow = Awaited<ReturnType<typeof paymentReceiptModel.findAll>>[number];
type CashMovementFields = NonNullable<ReceiptRow["cashMovement"]>;

const MOVEMENT_DECIMAL_FIELDS: (keyof CashMovementFields)[] = [
  "usdIncome", "arsIncome", "usdExpense", "arsExpense",
];

function serializeReceipt(receipt: ReceiptRow) {
  return {
    ...receipt,
    cashMovement: receipt.cashMovement
      ? serializeDecimals(receipt.cashMovement, MOVEMENT_DECIMAL_FIELDS)
      : null,
  };
}

export async function getPaymentReceipts(params?: {
  saleId?: string;
  personId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requirePermission("sales:view");

  try {
    const receipts = await paymentReceiptModel.findAll({
      saleId: params?.saleId,
      personId: params?.personId,
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
    });
    return receipts.map(serializeReceipt);
  } catch (error) {
    console.error("Error fetching payment receipts:", error);
    return [];
  }
}

export async function getPaymentReceiptById(id: string) {
  await requirePermission("sales:view");

  try {
    const receipt = await paymentReceiptModel.findById(id);
    if (!receipt) return null;
    return serializeReceipt(receipt);
  } catch (error) {
    console.error("Error fetching payment receipt:", error);
    return null;
  }
}

export async function generateReceipt(
  cashMovementId: string
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  try {
    await receiptService.generateReceipt(cashMovementId, session.user.id);
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    console.error("Error generating receipt:", error);
    return { success: false, error: "Error al generar el recibo" };
  }
}
