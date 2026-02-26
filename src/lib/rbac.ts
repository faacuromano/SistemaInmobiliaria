import { type Role } from "@/types/enums";
import { rolePermissionModel } from "@/server/models/role-permission.model";

export type Permission =
  | "*"
  | "dashboard:view"
  | "developments:view"
  | "developments:manage"
  | "lots:view"
  | "lots:manage"
  | "persons:view"
  | "persons:manage"
  | "sales:view"
  | "sales:manage"
  | "cash:view"
  | "cash:manage"
  | "signings:view"
  | "signings:manage"
  | "users:view"
  | "users:manage"
  | "config:manage";

export const ALL_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "developments:view",
  "developments:manage",
  "lots:view",
  "lots:manage",
  "persons:view",
  "persons:manage",
  "sales:view",
  "sales:manage",
  "cash:view",
  "cash:manage",
  "signings:view",
  "signings:manage",
  "users:view",
  "users:manage",
  "config:manage",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: ["*"],
  ADMINISTRACION: [
    "dashboard:view",
    "developments:view",
    "developments:manage",
    "lots:view",
    "lots:manage",
    "persons:view",
    "persons:manage",
    "sales:view",
    "sales:manage",
    "signings:view",
    "signings:manage",
    "users:view",
  ],
  FINANZAS: [
    "dashboard:view",
    "developments:view",
    "sales:view",
    "cash:view",
    "cash:manage",
    "persons:view",
  ],
  COBRANZA: [
    "dashboard:view",
    "developments:view",
    "persons:view",
    "sales:view",
    "cash:view",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = DEFAULT_ROLE_PERMISSIONS[role];
  return permissions.includes("*") || permissions.includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permiso denegado: se requiere ${permission}`);
  }
}

/**
 * Check permission against the database.
 * Falls back to hardcoded defaults if no DB records exist for the role.
 */
export async function checkPermissionDb(
  role: Role,
  permission: Permission
): Promise<boolean> {
  if (role === "SUPER_ADMIN") return true; // Super admin always has all permissions

  const dbPermissions = await rolePermissionModel.findByRole(role);

  // If no DB records, fall back to hardcoded defaults
  if (dbPermissions.length === 0) {
    return DEFAULT_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
  }

  return dbPermissions.includes("*") || dbPermissions.includes(permission);
}

/**
 * Get all permissions for a role from the database.
 * Falls back to hardcoded defaults if no DB records exist.
 */
export async function getRolePermissionsFromDb(
  role: Role
): Promise<Permission[]> {
  if (role === "SUPER_ADMIN") return ALL_PERMISSIONS; // Return all permissions

  const dbPermissions = await rolePermissionModel.findByRole(role);

  if (dbPermissions.length === 0) {
    return DEFAULT_ROLE_PERMISSIONS[role] ?? [];
  }

  return dbPermissions as Permission[];
}
