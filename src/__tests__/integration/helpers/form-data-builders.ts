/**
 * FormData builder helpers for integration tests.
 * All values are strings (FormData stores string values).
 */

// ---------------------------------------------------------------------------
// Sale FormData builder
// ---------------------------------------------------------------------------

interface SaleFormDataOverrides {
  lotId?: string
  personId?: string
  sellerId?: string
  saleDate?: string
  totalPrice?: string
  downPayment?: string
  currency?: string
  totalInstallments?: string
  firstInstallmentAmount?: string
  firstInstallmentMonth?: string
  collectionDay?: string
  commissionAmount?: string
  status?: string
  notes?: string
  paymentWindow?: string
}

/**
 * Build a FormData for createSale server action with sensible defaults
 * for an ACTIVA sale with 12 installments.
 * Override any field via the overrides parameter.
 * If an override value is `undefined`, that key is NOT appended to FormData.
 */
export function buildSaleFormData(overrides: SaleFormDataOverrides = {}): FormData {
  const defaults: Record<string, string> = {
    lotId: 'lot-1',
    personId: 'person-1',
    saleDate: '2025-06-15',
    totalPrice: '25000',
    currency: 'USD',
    totalInstallments: '12',
    firstInstallmentMonth: '2025-07',
    collectionDay: '10',
    status: 'ACTIVA',
  }

  const merged = { ...defaults, ...overrides }
  const formData = new FormData()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      formData.append(key, value)
    }
  }
  return formData
}

// ---------------------------------------------------------------------------
// Payment FormData builders
// ---------------------------------------------------------------------------

interface PaymentFormDataOverrides {
  installmentId?: string
  amount?: string
  currency?: string
  manualRate?: string
  notes?: string
  date?: string
}

/**
 * Builds a FormData for payInstallment server action.
 * Defaults: installmentId='inst-1', amount='2083.33', currency='USD'
 */
export function buildPaymentFormData(overrides: PaymentFormDataOverrides = {}): FormData {
  const defaults: Record<string, string | undefined> = {
    installmentId: 'inst-1',
    amount: '2083.33',
    currency: 'USD',
  }

  const merged = { ...defaults, ...overrides }
  const fd = new FormData()

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      fd.append(key, value)
    }
  }

  return fd
}

interface ExtraChargePaymentFormDataOverrides {
  extraChargeId?: string
  amount?: string
  currency?: string
  manualRate?: string
  notes?: string
  date?: string
}

/**
 * Builds a FormData for payExtraCharge server action.
 * Defaults: extraChargeId='ec-1', amount='5000', currency='USD'
 */
export function buildExtraChargePaymentFormData(
  overrides: ExtraChargePaymentFormDataOverrides = {}
): FormData {
  const defaults: Record<string, string | undefined> = {
    extraChargeId: 'ec-1',
    amount: '5000',
    currency: 'USD',
  }

  const merged = { ...defaults, ...overrides }
  const fd = new FormData()

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) {
      fd.append(key, value)
    }
  }

  return fd
}
