/**
 * Custom error class for business logic errors in services.
 * Actions catch these to return { success: false, error: message }.
 */
export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceError";
  }
}
