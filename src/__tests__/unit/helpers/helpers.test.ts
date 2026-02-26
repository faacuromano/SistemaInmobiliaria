import { describe, it, expect, vi } from 'vitest'
import { createAuthMock, mockAuthenticatedUser } from '@/__tests__/helpers/auth'
import { expectMoney } from '@/__tests__/helpers/money'

describe('mockAuthenticatedUser', () => {
  it('returns mock functions for requirePermission and requireAuth', () => {
    const mock = mockAuthenticatedUser('SUPER_ADMIN')
    expect(mock.requirePermission).toBeDefined()
    expect(mock.requireAuth).toBeDefined()
    expect(vi.isMockFunction(mock.requirePermission)).toBe(true)
    expect(vi.isMockFunction(mock.requireAuth)).toBe(true)
  })

  it('resolves with session containing the specified role', async () => {
    const mock = createAuthMock('ADMINISTRACION')
    const session = await mock.requirePermission('sales:view')
    expect(session.user.role).toBe('ADMINISTRACION')
    expect(session.user.id).toBe('test-administracion')
    expect(session.user.email).toBe('administracion@test.com')
  })

  it('works for all 4 RBAC roles', async () => {
    const roles = ['SUPER_ADMIN', 'ADMINISTRACION', 'FINANZAS', 'COBRANZA'] as const
    for (const role of roles) {
      const mock = createAuthMock(role)
      const session = await mock.requirePermission('any:permission')
      expect(session.user.role).toBe(role)
    }
  })

  it('defaults to SUPER_ADMIN when no role specified', async () => {
    const mock = mockAuthenticatedUser()
    const session = await mock.requirePermission('any:permission')
    expect(session.user.role).toBe('SUPER_ADMIN')
  })
})

describe('expectMoney', () => {
  it('passes for exact match', () => {
    expectMoney(100.50, 100.50)
  })

  it('passes for values within 2-decimal precision', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in IEEE 754
    expectMoney(0.1 + 0.2, 0.3)
  })

  it('fails for values differing by more than 2 decimal places', () => {
    expect(() => expectMoney(100.50, 100.60)).toThrow()
  })
})
