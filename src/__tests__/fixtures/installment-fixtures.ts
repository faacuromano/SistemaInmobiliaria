/**
 * Shared test fixtures for installment-related tests.
 * Named scenarios map to FIN-XX requirements and are reused across
 * generator, preview parity, and recalculator test files.
 */

import type { Currency } from '@/generated/prisma/client/client'

/** Base params shared by both generator and preview functions */
export interface SharedInstallmentParams {
  totalInstallments: number
  regularInstallmentAmount: number
  firstInstallmentAmount?: number
  firstInstallmentMonth: string // "YYYY-MM"
  collectionDay: number
}

/** Extension for generator (adds saleId + currency) */
interface GeneratorParams extends SharedInstallmentParams {
  saleId: string
  currency: Currency
}

/**
 * Converts shared params to generator params by adding saleId and currency.
 * Defaults: saleId = 'test-sale', currency = 'USD'
 */
export function toGeneratorParams(
  shared: SharedInstallmentParams,
  saleId = 'test-sale',
  currency: Currency = 'USD'
): GeneratorParams {
  return { ...shared, saleId, currency }
}

// ---- Named Scenarios ----

/** Base scenario: 60 monthly installments of $250 USD, day 10 (FIN baseline) */
export const STANDARD_60_CUOTAS: SharedInstallmentParams = {
  totalInstallments: 60,
  regularInstallmentAmount: 250,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}

/** Variable first installment: first $500, rest $250 (FIN-03) */
export const VARIABLE_FIRST_INSTALLMENT: SharedInstallmentParams = {
  totalInstallments: 12,
  regularInstallmentAmount: 250,
  firstInstallmentAmount: 500,
  firstInstallmentMonth: '2025-03',
  collectionDay: 15,
}

/** Day-31 clamping across all short months (FIN-01) */
export const DAY_31_CLAMPING: SharedInstallmentParams = {
  totalInstallments: 12,
  regularInstallmentAmount: 200,
  firstInstallmentMonth: '2025-01', // Jan(31), Feb(28), Mar(31), Apr(30)...
  collectionDay: 31,
}

/** Leap year Feb: 2024 has 29 days in Feb (FIN-01 leap) */
export const LEAP_YEAR_FEB: SharedInstallmentParams = {
  totalInstallments: 3,
  regularInstallmentAmount: 300,
  firstInstallmentMonth: '2024-01', // 2024 is leap year, Feb has 29 days
  collectionDay: 31,
}

/** Non-leap year Feb: 2025 has 28 days in Feb (FIN-01 non-leap) */
export const NON_LEAP_YEAR_FEB: SharedInstallmentParams = {
  totalInstallments: 3,
  regularInstallmentAmount: 300,
  firstInstallmentMonth: '2025-01', // 2025 is not leap year, Feb has 28 days
  collectionDay: 31,
}

/** Year rollover: Oct 2025 through Mar 2026 (FIN-02) */
export const YEAR_ROLLOVER: SharedInstallmentParams = {
  totalInstallments: 6,
  regularInstallmentAmount: 500,
  firstInstallmentMonth: '2025-10', // Oct -> Nov -> Dec -> Jan 2026 -> Feb -> Mar
  collectionDay: 15,
}

/** Contado sale: zero installments (FIN-04) */
export const CONTADO_SALE: SharedInstallmentParams = {
  totalInstallments: 0,
  regularInstallmentAmount: 0,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}

/** ARS currency passthrough: 6 installments of $50,000 ARS */
export const ARS_CURRENCY: SharedInstallmentParams = {
  totalInstallments: 6,
  regularInstallmentAmount: 50000,
  firstInstallmentMonth: '2025-01',
  collectionDay: 10,
}
