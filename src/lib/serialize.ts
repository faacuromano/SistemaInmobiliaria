/**
 * Convert Prisma Decimal fields to plain numbers for client consumption.
 * Accepts an object and a list of field names to convert.
 *
 * The return type maps the specified fields to `number | null`,
 * preserving all other field types.
 */
export type Serialized<T, K extends keyof T> = {
  [P in keyof T]: P extends K ? number | null : T[P];
};

export function serializeDecimals<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[]
): Serialized<T, K> {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    const value = result[field as string];
    result[field as string] = value != null ? Number(value) : null;
  }
  return result as Serialized<T, K>;
}
