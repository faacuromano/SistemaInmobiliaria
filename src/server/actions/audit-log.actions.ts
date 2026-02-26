"use server";

import { requirePermission } from "@/lib/auth-guard";
import { auth } from "@/lib/auth";
import { auditLogModel } from "@/server/models/audit-log.model";

/**
 * List audit logs with optional filters.
 * Requires config:manage permission.
 */
export async function getAuditLogs(params?: {
  search?: string;
  entity?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  await requirePermission("config:manage");

  try {
    const logs = await auditLogModel.findAll({
      search: params?.search,
      entity: params?.entity,
      userId: params?.userId,
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
    });

    return logs.map((log) => ({
      ...log,
      oldData: log.oldData ?? null,
      newData: log.newData ?? null,
    }));
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
}

/**
 * Utility helper to create an audit log entry.
 * Can be called from any server action to log important operations.
 * If userId is not provided, it reads from the current session.
 */
export async function logAction(
  entity: string,
  entityId: string,
  action: string,
  details?: { oldData?: unknown; newData?: unknown },
  userId?: string
) {
  try {
    let resolvedUserId = userId;

    if (!resolvedUserId) {
      const session = await auth();
      resolvedUserId = session?.user?.id;
    }

    if (!resolvedUserId) {
      console.warn("logAction: No userId available, skipping audit log");
      return;
    }

    await auditLogModel.create({
      userId: resolvedUserId,
      entity,
      entityId,
      action,
      oldData: details?.oldData ? (details.oldData as object) : undefined,
      newData: details?.newData ? (details.newData as object) : undefined,
    });
  } catch (error) {
    // Never let audit logging break the main operation
    console.error("Error creating audit log:", error);
  }
}
