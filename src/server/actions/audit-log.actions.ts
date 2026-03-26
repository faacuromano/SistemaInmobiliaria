"use server";

import { requirePermission } from "@/lib/auth-guard";
import { auth } from "@/lib/auth";
import { auditLogModel } from "@/server/models/audit-log.model";

/**
 * logAction variant that auto-resolves userId from session.
 * Used when calling from actions that don't have the userId handy.
 */
export async function logActionFromSession(
  entity: string,
  entityId: string,
  action: string,
  details?: { oldData?: unknown; newData?: unknown }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      console.warn("logActionFromSession: No session, skipping audit log");
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
