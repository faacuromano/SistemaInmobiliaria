"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { ServiceError } from "@/lib/service-error";
import type { ActionResult } from "@/types/actions";

export async function getBankAccounts() {
  await requirePermission("config:manage");
  return prisma.bankAccount.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getActiveBankAccounts() {
  return prisma.bankAccount.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createBankAccount(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("config:manage");

  const name = formData.get("name") as string;
  const cbu = formData.get("cbu") as string | null;
  const alias = formData.get("alias") as string | null;

  if (!name?.trim()) {
    return { success: false, error: "El nombre es requerido" };
  }

  try {
    await prisma.bankAccount.create({
      data: {
        name: name.trim(),
        cbu: cbu?.trim() || null,
        alias: alias?.trim() || null,
      },
    });
    revalidatePath("/configuracion");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la cuenta bancaria" };
  }
}

export async function toggleBankAccount(id: string): Promise<ActionResult> {
  await requirePermission("config:manage");

  try {
    const account = await prisma.bankAccount.findUnique({ where: { id } });
    if (!account) return { success: false, error: "Cuenta no encontrada" };

    await prisma.bankAccount.update({
      where: { id },
      data: { isActive: !account.isActive },
    });
    revalidatePath("/configuracion");
    return { success: true };
  } catch {
    return { success: false, error: "Error al actualizar la cuenta" };
  }
}
