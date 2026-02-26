import { vi } from 'vitest'
import type { Role } from '@/types/enums'

/**
 * Creates mock functions matching the auth-guard module exports.
 * Returns an object with requirePermission and requireAuth as vi.fn() mocks
 * that resolve to a session object for the given role.
 *
 * @param role - One of the 4 RBAC roles (defaults to SUPER_ADMIN)
 */
export function createAuthMock(role: Role = 'SUPER_ADMIN') {
  const session = {
    user: {
      id: `test-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@test.com`,
      name: `Test ${role}`,
      role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  }

  return {
    requirePermission: vi.fn().mockResolvedValue(session),
    requireAuth: vi.fn().mockResolvedValue(session),
  }
}

/**
 * Convenience wrapper for use with vi.mock().
 *
 * Usage in test file:
 *   import { mockAuthenticatedUser } from '@/__tests__/helpers/auth'
 *   vi.mock('@/lib/auth-guard', () => mockAuthenticatedUser('ADMINISTRACION'))
 *
 * IMPORTANT: vi.mock() calls are hoisted to top of file by Vitest.
 * Place them at the top level of test files, not inside beforeEach/describe.
 */
export function mockAuthenticatedUser(role: Role = 'SUPER_ADMIN') {
  return createAuthMock(role)
}
