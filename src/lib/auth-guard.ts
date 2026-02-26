import { redirect } from "next/navigation";
import { auth } from "./auth";
import { checkPermissionDb, type Permission } from "./rbac";
import { type Role } from "@/types/enums";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  const allowed = await checkPermissionDb(
    session.user.role as Role,
    permission
  );
  if (!allowed) {
    throw new Error(`Permiso denegado: se requiere ${permission}`);
  }
  return session;
}
