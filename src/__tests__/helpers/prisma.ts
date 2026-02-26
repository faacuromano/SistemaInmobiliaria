import { beforeEach } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@/generated/prisma/client/client'

/**
 * Deep mock of PrismaClient for tests needing database interaction mocks.
 * All nested methods (e.g., prisma.installment.findMany) are auto-mocked.
 *
 * Usage in test file:
 *   import { prismaMock } from '@/__tests__/helpers/prisma'
 *   vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))
 *
 *   // Then configure return values:
 *   prismaMock.sale.findMany.mockResolvedValue([...])
 */
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>()

// Reset all mock state between tests to prevent cross-test pollution
beforeEach(() => {
  mockReset(prismaMock)
})
