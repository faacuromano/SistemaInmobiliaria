import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { paymentReceiptModel } from "@/server/models/payment-receipt.model";
import { systemConfigModel } from "@/server/models/system-config.model";
import { sendEmail } from "@/lib/email";
import { receiptEmailHtml } from "@/lib/email-templates";

// ---------------------------------------------------------------------------
// Generate Receipt
// ---------------------------------------------------------------------------

export async function generateReceipt(
  cashMovementId: string,
  userId: string
): Promise<void> {
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
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dni: true,
          email: true,
        },
      },
    },
  });

  if (!cashMovement) {
    throw new ServiceError("Movimiento de caja no encontrado");
  }

  // 2. Check it doesn't already have a receipt
  const existingReceipt =
    await paymentReceiptModel.findByCashMovementId(cashMovementId);
  if (existingReceipt) {
    throw new ServiceError("Este movimiento ya tiene un recibo generado");
  }

  // 3. Must be linked to a sale
  if (!cashMovement.saleId || !cashMovement.sale) {
    throw new ServiceError(
      "El movimiento no esta vinculado a una venta"
    );
  }
  if (!cashMovement.personId || !cashMovement.person) {
    throw new ServiceError(
      "El movimiento no esta vinculado a una persona"
    );
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
  } else if (
    cashMovement.arsIncome &&
    Number(cashMovement.arsIncome) > 0
  ) {
    amount = Number(cashMovement.arsIncome);
    currency = "ARS";
  } else {
    amount = 0;
    currency =
      (cashMovement.sale.currency as "USD" | "ARS") || "USD";
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
  const dateFormatted = new Date(cashMovement.date).toLocaleDateString(
    "es-AR"
  );

  const content = [
    `Recibi de ${personName}${dniText},`,
    `la suma de ${amountFormatted}`,
    `en concepto de ${concept},`,
    `correspondiente al ${lotLabel} del desarrollo ${devName}.`,
    `Fecha: ${dateFormatted}.`,
  ].join("\n");

  // 7. Generate receipt number and create
  const receiptNumber = await paymentReceiptModel.generateReceiptNumber();

  await paymentReceiptModel.create({
    cashMovementId,
    saleId: cashMovement.saleId,
    personId: cashMovement.personId,
    receiptNumber,
    content,
    generatedById: userId,
  });

  // 8. Send receipt email (fire-and-forget)
  const personEmail = cashMovement.person.email;
  if (personEmail) {
    const amountDisplay =
      currency === "USD"
        ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 })
        : amount.toLocaleString("es-AR", { minimumFractionDigits: 2 });

    let companyName: string | undefined;
    try {
      companyName =
        (await systemConfigModel.get("company_name")) ?? undefined;
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
}
