/**
 * Server-side installment generator.
 * Used by sale.actions.ts to produce installment records for Prisma createMany.
 */

import { MONTH_NAMES } from "./sale-helpers";
import type { Currency } from "@/generated/prisma/client/client";

interface GenerateInstallmentsParams {
  saleId: string;
  totalInstallments: number;
  regularInstallmentAmount: number;
  firstInstallmentAmount?: number;
  firstInstallmentMonth: string; // "YYYY-MM"
  collectionDay: number;
  currency: Currency;
}

interface InstallmentData {
  saleId: string;
  installmentNumber: number;
  amount: number;
  currency: Currency;
  dueDate: Date;
  monthLabel: string;
}

/**
 * Generates an array of installment data objects ready for database insertion.
 *
 * - Installment 1 uses `firstInstallmentAmount` when provided, otherwise `regularInstallmentAmount`.
 * - Installments 2..N always use `regularInstallmentAmount`.
 * - Due dates respect `collectionDay`; when `collectionDay` exceeds the number of
 *   days in the target month the last day of that month is used instead.
 */
export function generateInstallments(
  params: GenerateInstallmentsParams
): InstallmentData[] {
  const {
    saleId,
    totalInstallments,
    regularInstallmentAmount,
    firstInstallmentAmount,
    firstInstallmentMonth,
    collectionDay,
    currency,
  } = params;

  // Parse "YYYY-MM" into year and 0-indexed month
  const [yearStr, monthStr] = firstInstallmentMonth.split("-");
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10) - 1; // 0-indexed

  const installments: InstallmentData[] = [];

  for (let i = 1; i <= totalInstallments; i++) {
    const amount =
      i === 1 && firstInstallmentAmount != null
        ? firstInstallmentAmount
        : regularInstallmentAmount;

    // Target month: baseMonth + (i - 1). Date constructor handles year overflow automatically.
    const targetMonth = baseMonth + (i - 1);
    const daysInMonth = new Date(baseYear, targetMonth + 1, 0).getDate();
    const day = Math.min(collectionDay, daysInMonth);
    const dueDate = new Date(baseYear, targetMonth, day);

    const monthLabel = `${MONTH_NAMES[dueDate.getMonth()]} ${dueDate.getFullYear()}`;

    installments.push({
      saleId,
      installmentNumber: i,
      amount,
      currency,
      dueDate,
      monthLabel,
    });
  }

  return installments;
}
