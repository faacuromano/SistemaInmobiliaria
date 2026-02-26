"use server";

import { requirePermission } from "@/lib/auth-guard";
import { paymentReceiptModel } from "@/server/models/payment-receipt.model";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { receiptEmailHtml } from "@/lib/email-templates";
import { systemConfigModel } from "@/server/models/system-config.model";
import type { ActionResult } from "@/types/actions";

// Serialize Prisma Decimal fields to plain numbers for client consumption
function serializeReceipt(receipt: Record<string, unknown>) {
  const cashMovement = receipt.cashMovement as Record<string, unknown> | null;
  return {
    ...receipt,
    cashMovement: cashMovement
      ? {
          ...cashMovement,
          usdIncome: cashMovement.usdIncome
            ? Number(cashMovement.usdIncome)
            : null,
          arsIncome: cashMovement.arsIncome
            ? Number(cashMovement.arsIncome)
            : null,
          usdExpense: cashMovement.usdExpense
            ? Number(cashMovement.usdExpense)
            : null,
          arsExpense: cashMovement.arsExpense
            ? Number(cashMovement.arsExpense)
            : null,
          manualRate:
            "manualRate" in cashMovement && cashMovement.manualRate
              ? Number(cashMovement.manualRate)
              : null,
        }
      : null,
  };
}

/**
 * List payment receipts with optional filters.
 * Uses sales:view so that any user who can see the sale can also see its receipts.
 */
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

/**
 * Get a single payment receipt by ID with full detail.
 */
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

/**
 * Generate a receipt for a specific cash movement.
 * Called automatically after payment or manually by user.
 */
export async function generateReceipt(
  cashMovementId: string
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  // 1. Validate the cash movement exists
  const cashMovement = await prisma.cashMovement.findUnique({
    where: { id: cashMovementId },
    include: {
      sale: {
        include: {
          lot: {
            select: {
              lotNumber: true,
              block: true,
              development: { select: { name: true } },
            },
          },
        },
      },
      installment: { select: { installmentNumber: true } },
      extraCharge: { select: { description: true } },
      person: {
        select: { id: true, firstName: true, lastName: true, dni: true, email: true },
      },
    },
  });

  if (!cashMovement) {
    return { success: false, error: "Movimiento de caja no encontrado" };
  }

  // 2. Check it doesn't already have a receipt
  const existingReceipt = await paymentReceiptModel.findByCashMovementId(
    cashMovementId
  );
  if (existingReceipt) {
    return { success: false, error: "Este movimiento ya tiene un recibo generado" };
  }

  // 3. Must be linked to a sale
  if (!cashMovement.saleId || !cashMovement.sale) {
    return {
      success: false,
      error: "El movimiento no esta vinculado a una venta",
    };
  }

  if (!cashMovement.personId || !cashMovement.person) {
    return {
      success: false,
      error: "El movimiento no esta vinculado a una persona",
    };
  }

  // 4. Build concept text
  const lot = cashMovement.sale.lot;
  const lotLabel = lot.block
    ? `Lote ${lot.lotNumber} - Mz ${lot.block}`
    : `Lote ${lot.lotNumber}`;
  const devName = lot.development.name;

  let concept: string;
  if (cashMovement.installment) {
    concept = `Cuota ${cashMovement.installment.installmentNumber} - ${lotLabel}`;
  } else if (cashMovement.extraCharge) {
    concept = `Refuerzo: ${cashMovement.extraCharge.description} - ${lotLabel}`;
  } else {
    concept = `${cashMovement.concept} - ${lotLabel}`;
  }

  // 5. Determine amount and currency
  let amount: number;
  let currency: "USD" | "ARS";
  if (cashMovement.usdIncome && Number(cashMovement.usdIncome) > 0) {
    amount = Number(cashMovement.usdIncome);
    currency = "USD";
  } else if (cashMovement.arsIncome && Number(cashMovement.arsIncome) > 0) {
    amount = Number(cashMovement.arsIncome);
    currency = "ARS";
  } else {
    amount = 0;
    currency = (cashMovement.sale.currency as "USD" | "ARS") || "USD";
  }

  // 6. Build content text
  const personName = `${cashMovement.person.firstName} ${cashMovement.person.lastName}`;
  const dniText = cashMovement.person.dni
    ? ` (DNI: ${cashMovement.person.dni})`
    : "";
  const amountFormatted =
    currency === "USD"
      ? `USD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : `ARS ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  const dateFormatted = new Date(cashMovement.date).toLocaleDateString("es-AR");

  const content = [
    `Recibi de ${personName}${dniText},`,
    `la suma de ${amountFormatted}`,
    `en concepto de ${concept},`,
    `correspondiente al ${lotLabel} del desarrollo ${devName}.`,
    `Fecha: ${dateFormatted}.`,
  ].join("\n");

  try {
    // 7. Generate receipt number and create
    const receiptNumber = await paymentReceiptModel.generateReceiptNumber();

    await paymentReceiptModel.create({
      cashMovementId,
      saleId: cashMovement.saleId,
      personId: cashMovement.personId,
      receiptNumber,
      content,
      generatedById: session.user.id,
    });

    // 8. Send receipt email (fire-and-forget — never blocks or fails the flow)
    const personEmail = cashMovement.person.email;
    if (personEmail) {
      const amountDisplay =
        currency === "USD"
          ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 })
          : amount.toLocaleString("es-AR", { minimumFractionDigits: 2 });

      // Load company name for the email template
      let companyName: string | undefined;
      try {
        companyName = (await systemConfigModel.get("company_name")) ?? undefined;
      } catch {
        // Ignore — will use default in template
      }

      const html = receiptEmailHtml({
        receiptNumber,
        clientName: personName,
        concept,
        amount: amountDisplay,
        currency,
        date: dateFormatted,
        developmentName: devName,
        lotNumber: lot.lotNumber,
        companyName,
      });

      sendEmail({
        to: personEmail,
        subject: `Recibo de Pago ${receiptNumber}`,
        html,
      }).catch((err) => {
        console.error("[receipt] Error sending receipt email:", err);
      });
    } else {
      console.log(
        `[receipt] No email for person ${cashMovement.personId} — skipping email`
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error generating receipt:", error);
    return { success: false, error: "Error al generar el recibo" };
  }
}
