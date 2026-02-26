import { describe, it, expect } from 'vitest'

describe('test infrastructure', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves @/ path aliases', async () => {
    const { MONTH_NAMES } = await import('@/lib/sale-helpers')
    expect(MONTH_NAMES).toHaveLength(12)
    expect(MONTH_NAMES[0]).toBe('ENERO')
  })
})
