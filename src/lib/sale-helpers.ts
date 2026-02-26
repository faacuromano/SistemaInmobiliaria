/**
 * Sale helper utilities (client-safe).
 * This file is imported by "use client" components — do NOT add server-only imports.
 */

// Spanish month names (0-indexed: ENERO = index 0)
export const MONTH_NAMES = [
  "ENERO",
  "FEBRERO",
  "MARZO",
  "ABRIL",
  "MAYO",
  "JUNIO",
  "JULIO",
  "AGOSTO",
  "SEPTIEMBRE",
  "OCTUBRE",
  "NOVIEMBRE",
  "DICIEMBRE",
] as const;

/**
 * Returns a month label like "ABRIL 2025" for the given date.
 */
export function getMonthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Generates a preview array of installments for the sale form (before persisting).
 *
 * - Installment 1 uses `firstInstallmentAmount` when provided, otherwise `regularInstallmentAmount`.
 * - Installments 2..N always use `regularInstallmentAmount`.
 * - Due dates respect `collectionDay`; when `collectionDay` exceeds the number of
 *   days in the target month the last day of that month is used instead.
 */
export function calculateInstallmentPreview(params: {
  totalInstallments: number;
  firstInstallmentAmount?: number;
  regularInstallmentAmount: number;
  firstInstallmentMonth: string; // "YYYY-MM"
  collectionDay: number;
}): Array<{
  number: number;
  amount: number;
  dueDate: Date;
  monthLabel: string;
}> {
  const {
    totalInstallments,
    firstInstallmentAmount,
    regularInstallmentAmount,
    firstInstallmentMonth,
    collectionDay,
  } = params;

  // Parse "YYYY-MM" into year and 0-indexed month
  const [yearStr, monthStr] = firstInstallmentMonth.split("-");
  const baseYear = parseInt(yearStr, 10);
  const baseMonth = parseInt(monthStr, 10) - 1; // 0-indexed

  const installments: Array<{
    number: number;
    amount: number;
    dueDate: Date;
    monthLabel: string;
  }> = [];

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

    installments.push({
      number: i,
      amount,
      dueDate,
      monthLabel: getMonthLabel(dueDate),
    });
  }

  return installments;
}
