import { expect } from 'vitest'

/**
 * Assert financial amounts match to 2 decimal places.
 * Uses toBeCloseTo(n, 2) instead of toBe() to handle
 * IEEE 754 floating-point imprecision (e.g., 0.1 + 0.2 !== 0.3).
 *
 * @param received - The calculated value
 * @param expected - The expected value
 *
 * @example
 *   expectMoney(result.amount, 1500.33)
 */
export function expectMoney(received: number, expected: number): void {
  expect(received).toBeCloseTo(expected, 2)
}
