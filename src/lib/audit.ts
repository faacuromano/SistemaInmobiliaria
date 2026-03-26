import { auditLogModel } from "@/server/models/audit-log.model";

/**
 * Create an audit log entry. Silently fails — never breaks the calling operation.
 * Extracted from audit-log.actions.ts so services can use it without cross-layer imports.
 */
export async function logAction(
  entity: string,
  entityId: string,
  action: string,
  details?: { oldData?: unknown; newData?: unknown },
  userId?: string
) {
  try {
    if (!userId) {
      console.warn("logAction: No userId provided, skipping audit log");
      return;
    }

    await auditLogModel.create({
      userId,
      entity,
      entityId,
      action,
      oldData: details?.oldData ? (details.oldData as object) : undefined,
      newData: details?.newData ? (details.newData as object) : undefined,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}
