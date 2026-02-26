/**
 * Parity tests: calculateInstallmentPreview() vs generateInstallments()
 *
 * These two functions produce installment schedules independently:
 * - preview (client-safe) is used in the sale form
 * - generator (server-side) is used for DB persistence
 *
 * If they diverge, customers see different amounts than what gets stored.
 * This suite verifies field-by-field equality across multiple scenarios.
 *
 * FIN-05: Preview/generator parity
 * FIN-09: All monetary assertions use expectMoney
 */

import { describe, it, expect } from 'vitest'
import { calculateInstallmentPreview } from '@/lib/sale-helpers'
import { generateInstallments } from '@/lib/installment-generator'
import { expectMoney } from '@/__tests__/helpers/money'
import {
  STANDARD_60_CUOTAS,
  VARIABLE_FIRST_INSTALLMENT,
  YEAR_ROLLOVER,
  DAY_31_CLAMPING,
  toGeneratorParams,
  type SharedInstallmentParams,
} from '@/__tests__/fixtures/installment-fixtures'

/**
 * Runs a full parity check between preview and generator for a given scenario.
 * Asserts: same length, and for each index: amount (via expectMoney),
 * dueDate (via getTime), monthLabel, and number/installmentNumber mapping.
 */
function assertParity(scenario: SharedInstallmentParams, label: string) {
  const preview = calculateInstallmentPreview(scenario)
  const generated = generateInstallments(toGeneratorParams(scenario))

  // Same number of installments
  expect(generated).toHaveLength(preview.length)

  for (let i = 0; i < preview.length; i++) {
    // Amount parity (financial precision via expectMoney)
    expectMoney(generated[i].amount, preview[i].amount)

    // Due date parity (exact timestamp match)
    expect(generated[i].dueDate.getTime()).toBe(preview[i].dueDate.getTime())

    // Month label parity
    expect(generated[i].monthLabel).toBe(preview[i].monthLabel)

    // Number mapping: generator uses installmentNumber, preview uses number
    expect(generated[i].installmentNumber).toBe(preview[i].number)
  }
}

describe('FIN-05: preview/generator parity', () => {
  it('STANDARD_60_CUOTAS: 60 installments base case', () => {
    assertParity(STANDARD_60_CUOTAS, 'STANDARD_60_CUOTAS')
  })

  it('VARIABLE_FIRST_INSTALLMENT: first amount differs from regular', () => {
    assertParity(VARIABLE_FIRST_INSTALLMENT, 'VARIABLE_FIRST_INSTALLMENT')
  })

  it('YEAR_ROLLOVER: crosses Dec-Jan year boundary', () => {
    assertParity(YEAR_ROLLOVER, 'YEAR_ROLLOVER')
  })

  it('DAY_31_CLAMPING: day 31 clamped in short months', () => {
    assertParity(DAY_31_CLAMPING, 'DAY_31_CLAMPING')
  })
})
