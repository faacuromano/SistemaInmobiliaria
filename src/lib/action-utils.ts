import { ServiceError } from "@/lib/service-error";
import type { ActionResult } from "@/types/actions";

/**
 * Wraps a service call in the standard action try/catch pattern.
 * Catches ServiceError and returns { success: false, error: message }.
 * Catches unknown errors and returns a generic fallback message.
 *
 * Usage:
 *   return handleAction(
 *     () => someService.doSomething(data, userId),
 *     "Error al procesar la operacion"
 *   );
 */
export async function handleAction<T = void>(
  fn: () => Promise<T>,
  fallbackError: string
): Promise<ActionResult<T>> {
  try {
    const result = await fn();
    return result !== undefined
      ? { success: true, data: result }
      : ({ success: true } as ActionResult<T>);
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    console.error(fallbackError, error);
    return { success: false, error: fallbackError };
  }
}
