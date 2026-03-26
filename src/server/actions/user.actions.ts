"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { userModel } from "@/server/models/user.model";
import {
  userCreateSchema,
  userUpdateSchema,
  passwordChangeSchema,
} from "@/schemas/user.schema";
import * as userService from "@/server/services/user.service";
import type { ActionResult } from "@/types/actions";

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
  const session = await requirePermission("users:manage");

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

  try {
    await userService.createUser(parsed.data, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el usuario" };
  }
}

export async function updateUser(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("users:manage");

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
    await userService.updateUser(parsed.data, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el usuario" };
  }
}

export async function changeUserPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("users:manage");

  const raw = {
    id: formData.get("id"),
    password: formData.get("password"),
  };

  const parsed = passwordChangeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await userService.changeUserPassword(parsed.data.id, parsed.data.password, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar la contraseña" };
  }
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  const session = await requirePermission("users:manage");

  try {
    await userService.toggleUserActive(id, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar estado del usuario" };
  }
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
  const session = await requirePermission("users:manage");

  try {
    await userService.toggleUserSeller(id, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar estado de vendedor" };
  }
}

export async function updateUserCommission(
  id: string,
  rate: number | null
): Promise<ActionResult> {
  const session = await requirePermission("users:manage");

  try {
    await userService.updateUserCommission(id, rate, session.user.id);
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar comisión" };
  }
}
