import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/__tests__/helpers/prisma'
import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted before imports by Vitest)
// ---------------------------------------------------------------------------
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('SUPER_ADMIN'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/actions/audit-log.actions', () => ({ logAction: vi.fn() }))
vi.mock('@/server/actions/payment-receipt.actions', () => ({ generateReceipt: vi.fn() }))
vi.mock('@/lib/installment-recalculator', () => ({ recalculateInstallments: vi.fn() }))

import { payInstallment, payExtraCharge } from '@/server/actions/payment.actions'
import { recalculateInstallments } from '@/lib/installment-recalculator'
import {
  buildPaymentFormData,
  buildExtraChargePaymentFormData,
} from './helpers/form-data-builders'

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function buildMockInstallment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inst-1',
    saleId: 'sale-1',
    installmentNumber: 1,
    amount: 2083.33,
    paidAmount: 0,
    status: 'PENDIENTE',
    dueDate: new Date('2025-07-10'),
    monthLabel: 'JULIO 2025',
    currency: 'USD',
    originalAmount: null,
    paidDate: null,
    paidInCurrency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sale: {
      id: 'sale-1',
      personId: 'person-1',
      lot: { lotNumber: 'A-15', developmentId: 'dev-1' },
    },
    ...overrides,
  }
}

function buildMockExtraCharge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ec-1',
    saleId: 'sale-1',
    description: 'Refuerzo Agosto',
    amount: 5000,
    paidAmount: 0,
    status: 'PENDIENTE',
    dueDate: new Date('2025-08-15'),
    currency: 'USD',
    paidDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sale: {
      id: 'sale-1',
      personId: 'person-1',
      lot: { lotNumber: 'A-15', developmentId: 'dev-1' },
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Make $transaction execute the callback with prismaMock as the tx client
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))
  vi.mocked(recalculateInstallments).mockReset()
})

const prevState = { success: false as const, error: '' }

// ===========================================================================
// ACT-04: payInstallment
// ===========================================================================

describe('ACT-04: payInstallment -- CashMovement created and installment marked PAGADA', () => {
  it('creates CashMovement and marks installment PAGADA on full payment', async () => {
    prismaMock.installment.findUnique.mockResolvedValue(buildMockInstallment() as any)
    prismaMock.cashMovement.create.mockResolvedValue({ id: 'cm-1' } as any)
    prismaMock.installment.update.mockResolvedValue({} as any)
    // For "all paid?" check -- return empty means this is the only one (and we marked it paid)
    prismaMock.installment.findMany.mockResolvedValue([])
    prismaMock.sale.update.mockResolvedValue({} as any)

    const result = await payInstallment(prevState, buildPaymentFormData())

    expect(result).toEqual({ success: true })

    expect(prismaMock.cashMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'CUOTA',
          saleId: 'sale-1',
        }),
      })
    )

    expect(prismaMock.installment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PAGADA',
        }),
      })
    )
  })

  it('marks installment PARCIAL on partial payment', async () => {
    prismaMock.installment.findUnique.mockResolvedValue(
      buildMockInstallment({ amount: 2083.33, paidAmount: 0 }) as any
    )
    prismaMock.cashMovement.create.mockResolvedValue({ id: 'cm-1' } as any)
    prismaMock.installment.update.mockResolvedValue({} as any)

    const result = await payInstallment(prevState, buildPaymentFormData({ amount: '500' }))

    expect(result).toEqual({ success: true })

    expect(prismaMock.installment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PARCIAL',
          paidAmount: 500,
        }),
      })
    )
  })

  it('rejects payment exceeding remaining balance', async () => {
    prismaMock.installment.findUnique.mockResolvedValue(
      buildMockInstallment({ amount: 2083.33, paidAmount: 2000 }) as any
    )

    const result = await payInstallment(prevState, buildPaymentFormData({ amount: '100' }))

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('supera el saldo'),
    })
  })

  it('rejects payment with missing installmentId', async () => {
    const result = await payInstallment(prevState, buildPaymentFormData({ installmentId: '' }))

    expect(result).toEqual({ success: false, error: 'ID de cuota requerido' })
  })

  it('rejects payment with amount <= 0', async () => {
    const result = await payInstallment(prevState, buildPaymentFormData({ amount: '0' }))

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('mayor a 0'),
    })
  })
})
