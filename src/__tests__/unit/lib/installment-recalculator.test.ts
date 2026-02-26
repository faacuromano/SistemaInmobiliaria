/**
 * Unit tests for recalculateInstallments() covering:
 * - FIN-06: First refuerzo reduces unpaid amounts and sets originalAmount
 * - FIN-07: Second refuerzo preserves originalAmount (does NOT overwrite)
 * - FIN-08: Reduction clamped to 0 at boundary scenarios
 * - FIN-09: All monetary assertions use expectMoney
 *
 * Uses prismaMock from shared helpers with vi.mock at module level.
 */

import { describe, it, expect, vi } from 'vitest'
import { prismaMock } from '@/__tests__/helpers/prisma'
import { expectMoney } from '@/__tests__/helpers/money'

// CRITICAL: vi.mock must be at module level BEFORE importing the function under test
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { recalculateInstallments } from '@/lib/installment-recalculator'

/** Factory for mock installment objects with sensible defaults */
function createMockInstallment(overrides: {
  id: string
  installmentNumber: number
  amount: number
  originalAmount?: number | null
  status?: string
}) {
  return {
    id: overrides.id,
    saleId: 'sale-1',
    installmentNumber: overrides.installmentNumber,
    amount: overrides.amount,
    originalAmount: overrides.originalAmount ?? null,
    currency: 'USD',
    status: overrides.status ?? 'PENDIENTE',
    dueDate: new Date('2025-06-15'),
    monthLabel: 'JUNIO 2025',
    paidAmount: 0,
    paidDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('recalculateInstallments', () => {
  // ----- FIN-06: first refuerzo -- unpaid installments reduced, originalAmount set -----
  describe('FIN-06: first refuerzo sets originalAmount and reduces amounts', () => {
    it('distributes paid amount evenly and sets originalAmount on null values', async () => {
      // 3 unpaid installments of $250 each, originalAmount is null (never recalculated)
      const mockInstallments = [
        createMockInstallment({ id: 'inst-1', installmentNumber: 1, amount: 250 }),
        createMockInstallment({ id: 'inst-2', installmentNumber: 2, amount: 250 }),
        createMockInstallment({ id: 'inst-3', installmentNumber: 3, amount: 250 }),
      ]

      prismaMock.installment.findMany.mockResolvedValue(mockInstallments as any)
      // $transaction executes the array of promises passed to it
      prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))

      await recalculateInstallments('sale-1', 300)
      // Reduction per installment: 300 / 3 = 100
      // New amount: 250 - 100 = 150

      // Verify findMany was called with correct where clause
      expect(prismaMock.installment.findMany).toHaveBeenCalledWith({
        where: {
          saleId: 'sale-1',
          status: { in: ['PENDIENTE', 'VENCIDA', 'PARCIAL'] },
        },
        orderBy: { installmentNumber: 'asc' },
      })

      // Verify update was called 3 times (once per installment)
      expect(prismaMock.installment.update).toHaveBeenCalledTimes(3)

      // Verify each update call has correct data
      for (let i = 0; i < 3; i++) {
        const callArgs = prismaMock.installment.update.mock.calls[i][0]
        expect(callArgs.where.id).toBe(`inst-${i + 1}`)
        expectMoney(callArgs.data.amount, 150)
        // originalAmount should be set to 250 (original) since it was null
        expectMoney(callArgs.data.originalAmount, 250)
      }

      // Verify $transaction was called exactly once (atomicity)
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1)

      // Verify the transaction argument array has length 3
      const txArg = prismaMock.$transaction.mock.calls[0][0]
      expect(txArg).toHaveLength(3)
    })
  })

  // ----- FIN-07: second refuerzo -- originalAmount NOT overwritten -----
  describe('FIN-07: second refuerzo preserves originalAmount', () => {
    it('does not overwrite originalAmount when already set (non-null)', async () => {
      // Installments already recalculated once: originalAmount=250, current amount=150
      const mockInstallments = [
        createMockInstallment({
          id: 'inst-1',
          installmentNumber: 1,
          amount: 150,
          originalAmount: 250,
        }),
        createMockInstallment({
          id: 'inst-2',
          installmentNumber: 2,
          amount: 150,
          originalAmount: 250,
        }),
        createMockInstallment({
          id: 'inst-3',
          installmentNumber: 3,
          amount: 150,
          originalAmount: 250,
        }),
      ]

      prismaMock.installment.findMany.mockResolvedValue(mockInstallments as any)
      prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))

      // Second refuerzo: $150 distributed across 3 -> $50 reduction each
      await recalculateInstallments('sale-1', 150)

      expect(prismaMock.installment.update).toHaveBeenCalledTimes(3)

      for (let i = 0; i < 3; i++) {
        const callArgs = prismaMock.installment.update.mock.calls[i][0]
        // Amount reduced from 150 to 100
        expectMoney(callArgs.data.amount, 100)
        // originalAmount should be undefined (Prisma ignores undefined fields)
        // This ensures it is NOT overwritten
        expect(callArgs.data.originalAmount).toBeUndefined()
      }
    })
  })

  // ----- FIN-08: reduction clamped to 0 -----
  describe('FIN-08: reduction clamped to 0', () => {
    it('clamps to 0 when reduction exactly equals installment amount', async () => {
      // 3 installments of $100, paidAmount = $300 -> reduction $100 each -> new = 0
      const mockInstallments = [
        createMockInstallment({ id: 'inst-1', installmentNumber: 1, amount: 100 }),
        createMockInstallment({ id: 'inst-2', installmentNumber: 2, amount: 100 }),
        createMockInstallment({ id: 'inst-3', installmentNumber: 3, amount: 100 }),
      ]

      prismaMock.installment.findMany.mockResolvedValue(mockInstallments as any)
      prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))

      await recalculateInstallments('sale-1', 300)

      expect(prismaMock.installment.update).toHaveBeenCalledTimes(3)

      for (let i = 0; i < 3; i++) {
        const callArgs = prismaMock.installment.update.mock.calls[i][0]
        expectMoney(callArgs.data.amount, 0)
      }
    })

    it('clamps to 0 when reduction exceeds installment amount', async () => {
      // 3 installments of $50, paidAmount = $300 -> reduction $100 each
      // 50 - 100 = -50 -> clamped to 0
      const mockInstallments = [
        createMockInstallment({ id: 'inst-1', installmentNumber: 1, amount: 50 }),
        createMockInstallment({ id: 'inst-2', installmentNumber: 2, amount: 50 }),
        createMockInstallment({ id: 'inst-3', installmentNumber: 3, amount: 50 }),
      ]

      prismaMock.installment.findMany.mockResolvedValue(mockInstallments as any)
      prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))

      await recalculateInstallments('sale-1', 300)

      expect(prismaMock.installment.update).toHaveBeenCalledTimes(3)

      for (let i = 0; i < 3; i++) {
        const callArgs = prismaMock.installment.update.mock.calls[i][0]
        expectMoney(callArgs.data.amount, 0)
      }
    })

    it('produces small positive result when reduction barely below amount', async () => {
      // 3 installments of $101, paidAmount = $300 -> reduction $100 each
      // 101 - 100 = 1
      const mockInstallments = [
        createMockInstallment({ id: 'inst-1', installmentNumber: 1, amount: 101 }),
        createMockInstallment({ id: 'inst-2', installmentNumber: 2, amount: 101 }),
        createMockInstallment({ id: 'inst-3', installmentNumber: 3, amount: 101 }),
      ]

      prismaMock.installment.findMany.mockResolvedValue(mockInstallments as any)
      prismaMock.$transaction.mockImplementation((ops: any) => Promise.resolve(ops))

      await recalculateInstallments('sale-1', 300)

      expect(prismaMock.installment.update).toHaveBeenCalledTimes(3)

      for (let i = 0; i < 3; i++) {
        const callArgs = prismaMock.installment.update.mock.calls[i][0]
        expectMoney(callArgs.data.amount, 1)
      }
    })
  })

  // ----- Additional: empty unpaid installments -----
  describe('edge cases', () => {
    it('returns without update or transaction when no unpaid installments exist', async () => {
      prismaMock.installment.findMany.mockResolvedValue([])

      await recalculateInstallments('sale-1', 500)

      // Should NOT call update or $transaction
      expect(prismaMock.installment.update).not.toHaveBeenCalled()
      expect(prismaMock.$transaction).not.toHaveBeenCalled()
    })

    it('queries installments with correct status filter', async () => {
      prismaMock.installment.findMany.mockResolvedValue([])

      await recalculateInstallments('sale-xyz', 100)

      expect(prismaMock.installment.findMany).toHaveBeenCalledWith({
        where: {
          saleId: 'sale-xyz',
          status: { in: ['PENDIENTE', 'VENCIDA', 'PARCIAL'] },
        },
        orderBy: { installmentNumber: 'asc' },
      })
    })
  })
})
