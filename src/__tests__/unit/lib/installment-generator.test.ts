/**
 * Unit tests for generateInstallments() covering:
 * - FIN-01: collectionDay 31 clamping in short months (Feb 28/29, Apr 30, Jun 30, Sep 30, Nov 30)
 * - FIN-02: year rollover when installments cross Dec-Jan boundary
 * - FIN-03: variable first installment amount
 * - FIN-04: zero installments (contado sale)
 * - FIN-09: all monetary assertions use expectMoney
 */

import { describe, it, expect } from 'vitest'
import { generateInstallments } from '@/lib/installment-generator'
import { expectMoney } from '@/__tests__/helpers/money'
import {
  STANDARD_60_CUOTAS,
  VARIABLE_FIRST_INSTALLMENT,
  DAY_31_CLAMPING,
  LEAP_YEAR_FEB,
  NON_LEAP_YEAR_FEB,
  YEAR_ROLLOVER,
  CONTADO_SALE,
  ARS_CURRENCY,
  toGeneratorParams,
} from '@/__tests__/fixtures/installment-fixtures'

describe('generateInstallments', () => {
  // ----- FIN-01: collectionDay 31 clamping in short months -----
  describe('FIN-01: collectionDay 31 clamping', () => {
    it('clamps day 31 to last day of each short month across a full year', () => {
      const result = generateInstallments(toGeneratorParams(DAY_31_CLAMPING))

      // 12 installments starting Jan 2025
      expect(result).toHaveLength(12)

      // Expected days per month for collectionDay=31:
      // Jan=31, Feb=28, Mar=31, Apr=30, May=31, Jun=30,
      // Jul=31, Aug=31, Sep=30, Oct=31, Nov=30, Dec=31
      const expectedDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

      result.forEach((inst, i) => {
        expect(inst.dueDate.getDate()).toBe(expectedDays[i])
      })
    })

    it('clamps Feb to 29 in leap year 2024', () => {
      const result = generateInstallments(toGeneratorParams(LEAP_YEAR_FEB))

      expect(result).toHaveLength(3)
      // Jan 2024: 31, Feb 2024: 29 (leap year), Mar 2024: 31
      expect(result[0].dueDate.getDate()).toBe(31)
      expect(result[1].dueDate.getDate()).toBe(29)
      expect(result[2].dueDate.getDate()).toBe(31)

      // Verify year and month
      expect(result[1].dueDate.getFullYear()).toBe(2024)
      expect(result[1].dueDate.getMonth()).toBe(1) // Feb = 1 (0-indexed)
    })

    it('clamps Feb to 28 in non-leap year 2025', () => {
      const result = generateInstallments(toGeneratorParams(NON_LEAP_YEAR_FEB))

      expect(result).toHaveLength(3)
      // Jan 2025: 31, Feb 2025: 28 (non-leap), Mar 2025: 31
      expect(result[0].dueDate.getDate()).toBe(31)
      expect(result[1].dueDate.getDate()).toBe(28)
      expect(result[2].dueDate.getDate()).toBe(31)

      // Verify year and month
      expect(result[1].dueDate.getFullYear()).toBe(2025)
      expect(result[1].dueDate.getMonth()).toBe(1) // Feb = 1 (0-indexed)
    })
  })

  // ----- FIN-02: year rollover (Dec to Jan next year) -----
  describe('FIN-02: year rollover', () => {
    it('correctly crosses the Dec-Jan year boundary', () => {
      const result = generateInstallments(toGeneratorParams(YEAR_ROLLOVER))

      expect(result).toHaveLength(6)

      // Installments 1-3 should be in 2025 (Oct, Nov, Dec)
      expect(result[0].dueDate.getFullYear()).toBe(2025)
      expect(result[0].dueDate.getMonth()).toBe(9)  // Oct
      expect(result[1].dueDate.getFullYear()).toBe(2025)
      expect(result[1].dueDate.getMonth()).toBe(10) // Nov
      expect(result[2].dueDate.getFullYear()).toBe(2025)
      expect(result[2].dueDate.getMonth()).toBe(11) // Dec

      // Installments 4-6 should be in 2026 (Jan, Feb, Mar)
      expect(result[3].dueDate.getFullYear()).toBe(2026)
      expect(result[3].dueDate.getMonth()).toBe(0)  // Jan
      expect(result[4].dueDate.getFullYear()).toBe(2026)
      expect(result[4].dueDate.getMonth()).toBe(1)  // Feb
      expect(result[5].dueDate.getFullYear()).toBe(2026)
      expect(result[5].dueDate.getMonth()).toBe(2)  // Mar
    })

    it('generates correct monthLabel across year boundary', () => {
      const result = generateInstallments(toGeneratorParams(YEAR_ROLLOVER))

      expect(result[0].monthLabel).toBe('OCTUBRE 2025')
      expect(result[1].monthLabel).toBe('NOVIEMBRE 2025')
      expect(result[2].monthLabel).toBe('DICIEMBRE 2025')
      expect(result[3].monthLabel).toBe('ENERO 2026')
      expect(result[4].monthLabel).toBe('FEBRERO 2026')
      expect(result[5].monthLabel).toBe('MARZO 2026')
    })
  })

  // ----- FIN-03: variable first installment amount -----
  describe('FIN-03: variable first installment', () => {
    it('uses firstInstallmentAmount for installment 1 when provided', () => {
      const result = generateInstallments(toGeneratorParams(VARIABLE_FIRST_INSTALLMENT))

      expect(result).toHaveLength(12)

      // First installment: $500
      expectMoney(result[0].amount, 500)

      // Remaining installments: all $250
      for (let i = 1; i < result.length; i++) {
        expectMoney(result[i].amount, 250)
      }
    })

    it('uses regularInstallmentAmount for all when firstInstallmentAmount not provided', () => {
      const result = generateInstallments(toGeneratorParams(STANDARD_60_CUOTAS))

      expect(result).toHaveLength(60)

      // All installments should be $250
      for (const inst of result) {
        expectMoney(inst.amount, 250)
      }
    })
  })

  // ----- FIN-04: zero installments (contado sale) -----
  describe('FIN-04: zero installments (contado)', () => {
    it('returns empty array for totalInstallments=0', () => {
      const result = generateInstallments(toGeneratorParams(CONTADO_SALE))

      expect(result).toHaveLength(0)
      expect(result).toEqual([])
    })
  })

  // ----- Additional verifications -----
  describe('general properties', () => {
    it('installmentNumber is sequential starting from 1', () => {
      const result = generateInstallments(toGeneratorParams(STANDARD_60_CUOTAS))

      result.forEach((inst, i) => {
        expect(inst.installmentNumber).toBe(i + 1)
      })
    })

    it('monthLabel format is "MONTH_NAME YEAR"', () => {
      const result = generateInstallments(toGeneratorParams(STANDARD_60_CUOTAS))

      // First installment: January 2025
      expect(result[0].monthLabel).toBe('ENERO 2025')
      // Second: February 2025
      expect(result[1].monthLabel).toBe('FEBRERO 2025')
      // 12th: December 2025
      expect(result[11].monthLabel).toBe('DICIEMBRE 2025')
    })

    it('passes through ARS currency correctly', () => {
      const result = generateInstallments(
        toGeneratorParams(ARS_CURRENCY, 'ars-sale', 'ARS')
      )

      expect(result).toHaveLength(6)

      for (const inst of result) {
        expect(inst.currency).toBe('ARS')
        expectMoney(inst.amount, 50000)
      }
    })

    it('passes through saleId to all installments', () => {
      const result = generateInstallments(
        toGeneratorParams(STANDARD_60_CUOTAS, 'my-custom-sale-id')
      )

      for (const inst of result) {
        expect(inst.saleId).toBe('my-custom-sale-id')
      }
    })

    it('sets collection day correctly when not clamped', () => {
      // STANDARD_60_CUOTAS uses collectionDay=10, all months have >= 10 days
      const result = generateInstallments(toGeneratorParams(STANDARD_60_CUOTAS))

      for (const inst of result) {
        expect(inst.dueDate.getDate()).toBe(10)
      }
    })
  })
})
