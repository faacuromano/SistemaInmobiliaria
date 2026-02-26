/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prismaMock } from '@/__tests__/helpers/prisma'
import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'

// Module-level mocks — hoisted by Vitest
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('SUPER_ADMIN'))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/server/actions/audit-log.actions', () => ({ logAction: vi.fn() }))
vi.mock('@/server/models/sale.model', () => ({
  saleModel: { findById: vi.fn(), findAll: vi.fn() },
}))
vi.mock('@/lib/installment-generator', () => ({
  generateInstallments: vi.fn().mockReturnValue([
    {
      saleId: 'sale-new',
      installmentNumber: 1,
      amount: 2083.33,
      paidAmount: 0,
      status: 'PENDIENTE',
      dueDate: new Date('2025-07-10'),
      monthLabel: 'JULIO 2025',
      currency: 'USD',
    },
    {
      saleId: 'sale-new',
      installmentNumber: 2,
      amount: 2083.33,
      paidAmount: 0,
      status: 'PENDIENTE',
      dueDate: new Date('2025-08-10'),
      monthLabel: 'AGOSTO 2025',
      currency: 'USD',
    },
  ]),
}))

// Import AFTER mocks
import { createSale, cancelSale } from '@/server/actions/sale.actions'
import { saleModel } from '@/server/models/sale.model'
import { generateInstallments } from '@/lib/installment-generator'
import { buildSaleFormData } from './helpers/form-data-builders'

beforeEach(() => {
  // Clear call counts for module-level mocks not covered by prismaMock's mockReset
  vi.mocked(generateInstallments).mockClear()

  // Configure $transaction to invoke callback with prismaMock (interactive transaction pattern)
  prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock))

  // Default mock return values for pre-transaction validation
  prismaMock.lot.findUnique.mockResolvedValue({ id: 'lot-1', status: 'DISPONIBLE' } as any)
  prismaMock.person.findUnique.mockResolvedValue({ id: 'person-1' } as any)
  prismaMock.sale.create.mockResolvedValue({ id: 'sale-new' } as any)
})

// ---------------------------------------------------------------------------
// ACT-01: createSale — lot status VENDIDO and installments generated
// ---------------------------------------------------------------------------
describe('ACT-01: createSale — lot status VENDIDO and installments generated', () => {
  it('creates sale, updates lot to VENDIDO, and generates installments', async () => {
    const formData = buildSaleFormData()
    const result = await createSale({ success: false, error: '' }, formData)

    expect(result).toEqual({ success: true })

    // Verify lot status updated to VENDIDO inside transaction
    expect(prismaMock.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: { status: 'VENDIDO' },
      })
    )

    // Verify installments were generated via createMany
    expect(prismaMock.installment.createMany).toHaveBeenCalled()

    // Verify generateInstallments was called with correct args
    expect(generateInstallments).toHaveBeenCalledWith(
      expect.objectContaining({
        saleId: 'sale-new',
        totalInstallments: 12,
      })
    )
  })

  it('rejects sale when lot is not DISPONIBLE', async () => {
    prismaMock.lot.findUnique.mockResolvedValue({ id: 'lot-1', status: 'VENDIDO' } as any)

    const formData = buildSaleFormData()
    const result = await createSale({ success: false, error: '' }, formData)

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('no está disponible'),
    })
  })

  it('rejects sale with missing required fields (Zod validation)', async () => {
    const formData = buildSaleFormData({ lotId: '', personId: '' })
    const result = await createSale({ success: false, error: '' }, formData)

    expect(result).toEqual({
      success: false,
      error: expect.any(String),
    })
    // Ensure it's actually a failure with a non-empty error message
    expect((result as { success: false; error: string }).error.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// ACT-02: cancelSale — lot status reverts to DISPONIBLE
// ---------------------------------------------------------------------------
describe('ACT-02: cancelSale — lot status reverts to DISPONIBLE', () => {
  it('cancels active sale and reverts lot to DISPONIBLE', async () => {
    // cancelSale uses saleModel.findById (NOT prismaMock.sale.findUnique)
    vi.mocked(saleModel.findById).mockResolvedValue({
      id: 'sale-1',
      lotId: 'lot-1',
      personId: 'person-1',
      sellerId: null,
      saleDate: new Date('2025-06-15'),
      totalPrice: 25000 as any,
      downPayment: null,
      currency: 'USD',
      totalInstallments: 12,
      firstInstallmentAmount: null,
      regularInstallmentAmount: 2083.33 as any,
      firstInstallmentMonth: '2025-07',
      collectionDay: 10,
      commissionAmount: null,
      status: 'ACTIVA',
      notes: null,
      paymentWindow: null,
      createdById: 'test-super_admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      lot: {
        id: 'lot-1',
        development: { id: 'dev-1', name: 'Test Development', slug: 'test-dev' },
      },
      person: { id: 'person-1', firstName: 'Juan', lastName: 'Perez', dni: '12345678', phone: null, email: null },
      seller: null,
      installments: [],
      extraCharges: [],
    } as any)

    const result = await cancelSale('sale-1')

    expect(result).toEqual({ success: true })

    // Verify sale status updated to CANCELADA
    expect(prismaMock.sale.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sale-1' },
        data: { status: 'CANCELADA' },
      })
    )

    // Verify lot reverted to DISPONIBLE
    expect(prismaMock.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: { status: 'DISPONIBLE' },
      })
    )
  })

  it('rejects cancellation of non-ACTIVA sale', async () => {
    vi.mocked(saleModel.findById).mockResolvedValue({
      id: 'sale-1',
      status: 'COMPLETADA',
      lotId: 'lot-1',
    } as any)

    const result = await cancelSale('sale-1')

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('Solo se pueden cancelar ventas activas'),
    })
  })

  it('returns error when sale not found', async () => {
    vi.mocked(saleModel.findById).mockResolvedValue(null)

    const result = await cancelSale('nonexistent-id')

    expect(result).toEqual({
      success: false,
      error: 'Venta no encontrada',
    })
  })
})

// ---------------------------------------------------------------------------
// ACT-03: createSale contado — zero installments, lot CONTADO
// ---------------------------------------------------------------------------
describe('ACT-03: createSale contado — zero installments, lot CONTADO', () => {
  it('creates contado sale with zero installments and lot status CONTADO', async () => {
    const formData = buildSaleFormData({ status: 'CONTADO', totalInstallments: '0' })
    const result = await createSale({ success: false, error: '' }, formData)

    expect(result).toEqual({ success: true })

    // installment.createMany should NOT be called for contado sales
    expect(prismaMock.installment.createMany).not.toHaveBeenCalled()

    // generateInstallments should NOT be called
    expect(generateInstallments).not.toHaveBeenCalled()

    // Lot should be updated to CONTADO
    expect(prismaMock.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'CONTADO' },
      })
    )
  })

  it('rejects contado sale with non-zero installments', async () => {
    const formData = buildSaleFormData({ status: 'CONTADO', totalInstallments: '5' })
    const result = await createSale({ success: false, error: '' }, formData)

    expect(result).toEqual({
      success: false,
      error: expect.stringContaining('no pueden tener cuotas'),
    })
  })
})
