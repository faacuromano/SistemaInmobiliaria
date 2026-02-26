"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { rolePermissionModel } from "@/server/models/role-permission.model";
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS } from "@/lib/rbac";
import type { Role } from "@/generated/prisma/client/client";
import type { ActionResult } from "@/types/actions";

/** Get all role permissions (grouped by role) */
export async function getAllRolePermissions() {
  await requirePermission("config:manage");

  const all = await rolePermissionModel.findAll();

  // Group by role
  const result: Record<string, string[]> = {};
  for (const { role, permission } of all) {
    if (!result[role]) result[role] = [];
    result[role].push(permission);
  }

  return result;
}

/** Update permissions for a specific role */
export async function updateRolePermissions(
  role: string,
  permissions: string[]
): Promise<ActionResult> {
  await requirePermission("config:manage");

  // SUPER_ADMIN permissions cannot be changed
  if (role === "SUPER_ADMIN") {
    return {
      success: false,
      error: "No se pueden modificar los permisos de Super Admin",
    };
  }

  // Validate all permissions are valid
  const validPermissions = permissions.filter((p) =>
    ALL_PERMISSIONS.includes(p as (typeof ALL_PERMISSIONS)[number])
  );

  try {
    await rolePermissionModel.setRolePermissions(
      role as Role,
      validPermissions
    );
  } catch {
    return { success: false, error: "Error al actualizar permisos" };
  }

  revalidatePath("/configuracion");
  return { success: true };
}

/** Seed default permissions into the database (only if empty) */
export async function seedDefaultPermissions(): Promise<ActionResult> {
  await requirePermission("config:manage");

  const count = await rolePermissionModel.count();
  if (count > 0) {
    return { success: false, error: "Los permisos ya fueron inicializados" };
  }

  try {
    for (const [role, permissions] of Object.entries(
      DEFAULT_ROLE_PERMISSIONS
    )) {
      await rolePermissionModel.setRolePermissions(
        role as Role,
        permissions as string[]
      );
    }
  } catch {
    return { success: false, error: "Error al inicializar permisos" };
  }

  revalidatePath("/configuracion");
  return { success: true };
}
