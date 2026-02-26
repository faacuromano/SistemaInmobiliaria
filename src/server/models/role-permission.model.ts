import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/client/client";

export const rolePermissionModel = {
  /** Get all permissions for a specific role */
  async findByRole(role: Role): Promise<string[]> {
    const records = await prisma.rolePermission.findMany({
      where: { role },
      select: { permission: true },
    });
    return records.map((r) => r.permission);
  },

  /** Get all role-permission mappings */
  async findAll(): Promise<Array<{ role: Role; permission: string }>> {
    return prisma.rolePermission.findMany({
      select: { role: true, permission: true },
      orderBy: [{ role: "asc" }, { permission: "asc" }],
    });
  },

  /** Set permissions for a role (replace all) */
  async setRolePermissions(role: Role, permissions: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.rolePermission.deleteMany({ where: { role } });
      // Insert new
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({ role, permission })),
        });
      }
    });
  },

  /** Check if permissions table has been seeded */
  async count(): Promise<number> {
    return prisma.rolePermission.count();
  },
};
