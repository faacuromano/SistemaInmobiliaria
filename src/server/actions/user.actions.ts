"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { userModel } from "@/server/models/user.model";
import {
  userCreateSchema,
  userUpdateSchema,
  passwordChangeSchema,
} from "@/schemas/user.schema";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@/generated/prisma/client/client";
import bcrypt from "bcryptjs";

export async function getUsers(params?: {
  search?: string;
  role?: string;
  isActive?: boolean;
}) {
  await requirePermission("users:view");
  return userModel.findAll(params);
}

export async function getUserById(id: string) {
  await requirePermission("users:view");
  return userModel.findById(id);
}

export async function createUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("users:manage");

  const raw = {
    email: formData.get("email"),
    name: formData.get("name"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    role: formData.get("role"),
    password: formData.get("password"),
  };

  const parsed = userCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);

  try {
    const user = await userModel.create({
      email: parsed.data.email,
      password: hashedPassword,
      name: parsed.data.name,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
    });

    await logAction("User", user.id, "CREATE", {
      newData: { email: parsed.data.email, name: parsed.data.name, lastName: parsed.data.lastName, role: parsed.data.role },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un usuario con ese email" };
    }
    throw error;
  }

  revalidatePath("/configuracion");
  return { success: true };
}

export async function updateUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("users:manage");

  const raw = {
    id: formData.get("id"),
    email: formData.get("email"),
    name: formData.get("name"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  };

  const parsed = userUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await userModel.update(parsed.data.id, {
      email: parsed.data.email,
      name: parsed.data.name,
      lastName: parsed.data.lastName,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
    });

    await logAction("User", parsed.data.id, "UPDATE", {
      newData: { email: parsed.data.email, name: parsed.data.name, lastName: parsed.data.lastName, role: parsed.data.role },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Ya existe un usuario con ese email" };
    }
    throw error;
  }

  revalidatePath("/configuracion");
  return { success: true };
}

export async function changeUserPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("users:manage");

  const raw = {
    id: formData.get("id"),
    password: formData.get("password"),
  };

  const parsed = passwordChangeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const hashedPassword = await bcrypt.hash(parsed.data.password, 10);
  await userModel.updatePassword(parsed.data.id, hashedPassword);

  await logAction("User", parsed.data.id, "UPDATE", {
    newData: { passwordChanged: true },
  });

  revalidatePath("/configuracion");
  return { success: true };
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  await requirePermission("users:manage");

  const user = await userModel.findById(id);
  if (!user) return { success: false, error: "Usuario no encontrado" };

  await userModel.toggleActive(id, !user.isActive);

  await logAction("User", id, "UPDATE", {
    oldData: { isActive: user.isActive },
    newData: { isActive: !user.isActive },
  });

  revalidatePath("/configuracion");
  return { success: true };
}

// --- Seller management actions ---

export async function getEmployees(params?: {
  search?: string;
  isActive?: boolean;
}) {
  await requirePermission("users:view");
  return userModel.findAllSellers(params);
}

export async function getActiveSellers() {
  await requirePermission("sales:manage");
  return userModel.findActiveSellers();
}

export async function toggleUserSeller(id: string): Promise<ActionResult> {
  await requirePermission("users:manage");

  const user = await userModel.findById(id);
  if (!user) return { success: false, error: "Usuario no encontrado" };

  await userModel.toggleSeller(id, !user.isSeller);
  revalidatePath("/configuracion");

  return { success: true };
}

export async function updateUserCommission(
  id: string,
  rate: number | null
): Promise<ActionResult> {
  await requirePermission("users:manage");

  const user = await userModel.findById(id);
  if (!user) return { success: false, error: "Usuario no encontrado" };

  await userModel.updateCommissionRate(id, rate);
  revalidatePath("/configuracion");

  return { success: true };
}
