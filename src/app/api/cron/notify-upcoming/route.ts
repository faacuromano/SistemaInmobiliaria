import { NextResponse } from "next/server";
import { cronModel } from "@/server/models/cron.model";
import { notificationModel } from "@/server/models/notification.model";
import { sendEmail } from "@/lib/email";
import {
  upcomingChargeEmailHtml,
  overdueInstallmentEmailHtml,
  upcomingSigningEmailHtml,
} from "@/lib/email-templates";

const DAYS_AHEAD = 3;

/**
 * Format a date as "DD/MM/YYYY" for display in Spanish locale.
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a Decimal-like value to a string with 2 decimal places.
 */
function formatAmount(value: unknown): string {
  return Number(value).toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * GET /api/cron/notify-upcoming
 *
 * Cron-compatible endpoint that runs daily to:
 * 1. Find extra charges (cuotas de refuerzo) due within the next 3 days and
 *    create notifications + send emails to buyers.
 * 2. Find overdue installments (cuotas ordinarias) and create notifications
 *    for system users (COBRANZA team).
 *
 * Secured via CRON_SECRET in the Authorization header.
 * Idempotent: uses `notified` flag on ExtraCharge and checks existing
 * notifications for Installments to avoid duplicates.
 */
export async function GET(request: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    upcomingCharges: { found: 0, notified: 0, emailsSent: 0, errors: 0 },
    overdueInstallments: { found: 0, notified: 0, emailsSent: 0, errors: 0 },
    upcomingSignings: { found: 0, notified: 0, emailsSent: 0, errors: 0 },
  };

  // ── 1. Upcoming Extra Charges (cuotas de refuerzo) ──────────────────────
  try {
    const upcomingCharges =
      await cronModel.findUpcomingExtraCharges(DAYS_AHEAD);
    results.upcomingCharges.found = upcomingCharges.length;

    for (const charge of upcomingCharges) {
      try {
        const person = charge.sale.person;
        const lot = charge.sale.lot;
        const development = lot.development;
        const clientName = `${person.firstName} ${person.lastName}`;
        const dueDateStr = formatDate(charge.dueDate);
        const amountStr = formatAmount(charge.amount);

        // Create notification for all active system users
        await notificationModel.createForAllUsers({
          type: "REFUERZO_PROXIMO",
          title: "Cuota de refuerzo proxima a vencer",
          body: `${clientName} - ${charge.description}: ${charge.currency} ${amountStr} vence el ${dueDateStr} (Lote ${lot.lotNumber} - ${development.name})`,
          referenceType: "ExtraCharge",
          referenceId: charge.id,
        });

        // Send email to the buyer if they have an email address
        if (person.email) {
          try {
            const emailHtml = upcomingChargeEmailHtml({
              clientName,
              description: charge.description,
              amount: amountStr,
              currency: charge.currency,
              dueDate: dueDateStr,
              developmentName: development.name,
              lotNumber: lot.lotNumber,
            });

            const sent = await sendEmail({
              to: person.email,
              subject:
                "Recordatorio: Cuota de refuerzo proxima a vencer",
              html: emailHtml,
            });

            if (sent) {
              results.upcomingCharges.emailsSent++;
            }
          } catch (emailError) {
            console.error(
              `[cron] Failed to send email for ExtraCharge ${charge.id}:`,
              emailError
            );
            // Don't fail the whole charge processing if email fails
          }
        }

        // Mark the charge as notified so it won't be picked up again
        await cronModel.markExtraChargeNotified(charge.id);
        results.upcomingCharges.notified++;
      } catch (chargeError) {
        console.error(
          `[cron] Failed to process ExtraCharge ${charge.id}:`,
          chargeError
        );
        results.upcomingCharges.errors++;
      }
    }
  } catch (error) {
    console.error("[cron] Failed to query upcoming extra charges:", error);
  }

  // ── 2. Overdue Installments (cuotas vencidas) ──────────────────────────
  try {
    const overdueInstallments = await cronModel.findOverdueInstallments();
    results.overdueInstallments.found = overdueInstallments.length;

    for (const installment of overdueInstallments) {
      try {
        // Check if we already created a CUOTA_VENCIDA notification for this one
        const alreadyNotified = await cronModel.hasOverdueNotification(
          installment.id
        );
        if (alreadyNotified) {
          continue;
        }

        const person = installment.sale.person;
        const lot = installment.sale.lot;
        const development = lot.development;
        const clientName = `${person.firstName} ${person.lastName}`;
        const dueDateStr = formatDate(installment.dueDate);
        const amountStr = formatAmount(installment.amount);

        // Create notification for all active system users (COBRANZA team)
        await notificationModel.createForAllUsers({
          type: "CUOTA_VENCIDA",
          title: "Cuota vencida",
          body: `${clientName} - Cuota ${installment.installmentNumber}: ${installment.currency} ${amountStr} vencio el ${dueDateStr} (Lote ${lot.lotNumber} - ${development.name})`,
          referenceType: "Installment",
          referenceId: installment.id,
        });

        // Send email to the buyer if they have an email address
        if (person.email) {
          try {
            const emailHtml = overdueInstallmentEmailHtml({
              clientName,
              installmentNumber: installment.installmentNumber,
              amount: amountStr,
              currency: installment.currency,
              dueDate: dueDateStr,
              developmentName: development.name,
              lotNumber: lot.lotNumber,
            });

            const sent = await sendEmail({
              to: person.email,
              subject: "Aviso: Cuota vencida",
              html: emailHtml,
            });

            if (sent) {
              results.overdueInstallments.emailsSent++;
            }
          } catch (emailError) {
            console.error(
              `[cron] Failed to send email for Installment ${installment.id}:`,
              emailError
            );
          }
        }

        results.overdueInstallments.notified++;
      } catch (installmentError) {
        console.error(
          `[cron] Failed to process Installment ${installment.id}:`,
          installmentError
        );
        results.overdueInstallments.errors++;
      }
    }
  } catch (error) {
    console.error("[cron] Failed to query overdue installments:", error);
  }

  // ── 3. Upcoming Signings (turnos de firma) ─────────────────────────────
  try {
    const upcomingSignings = await cronModel.findUpcomingSignings(1);
    results.upcomingSignings.found = upcomingSignings.length;

    for (const signing of upcomingSignings) {
      try {
        const alreadyNotified = await cronModel.hasSigningNotification(
          signing.id
        );
        if (alreadyNotified) {
          continue;
        }

        const clientName = signing.clientName || signing.lotInfo;
        const signingDateStr = formatDate(signing.date);
        const developmentName = signing.development?.name;

        await notificationModel.createForAllUsers({
          type: "FIRMA_PROXIMA",
          title: "Turno de firma proximo",
          body: `${clientName} - ${signingDateStr} ${signing.time}${developmentName ? ` (${developmentName})` : ""}${signing.lotNumbers ? ` - Lotes: ${signing.lotNumbers}` : ""}`,
          referenceType: "SigningSlot",
          referenceId: signing.id,
        });

        // Send email notification (signing doesn't have a direct Person relation,
        // so we only create system notifications for all users)
        if (signing.seller?.email) {
          try {
            const emailHtml = upcomingSigningEmailHtml({
              clientName,
              signingDate: signingDateStr,
              signingTime: signing.time,
              lotInfo: signing.lotInfo,
              developmentName: developmentName ?? undefined,
              lotNumbers: signing.lotNumbers ?? undefined,
            });

            const sent = await sendEmail({
              to: signing.seller.email,
              subject: "Recordatorio: Turno de firma proximo",
              html: emailHtml,
            });

            if (sent) {
              results.upcomingSignings.emailsSent++;
            }
          } catch (emailError) {
            console.error(
              `[cron] Failed to send email for SigningSlot ${signing.id}:`,
              emailError
            );
          }
        }

        results.upcomingSignings.notified++;
      } catch (signingError) {
        console.error(
          `[cron] Failed to process SigningSlot ${signing.id}:`,
          signingError
        );
        results.upcomingSignings.errors++;
      }
    }
  } catch (error) {
    console.error("[cron] Failed to query upcoming signings:", error);
  }

  // ── Response ────────────────────────────────────────────────────────────
  const totalNotified =
    results.upcomingCharges.notified +
    results.overdueInstallments.notified +
    results.upcomingSignings.notified;
  const totalErrors =
    results.upcomingCharges.errors +
    results.overdueInstallments.errors +
    results.upcomingSignings.errors;

  console.log(
    `[cron] notify-upcoming completed: ${totalNotified} notified, ${totalErrors} errors`,
    results
  );

  return NextResponse.json({
    success: true,
    notified: totalNotified,
    details: results,
    timestamp: new Date().toISOString(),
  });
}
