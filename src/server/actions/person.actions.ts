"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { personModel } from "@/server/models/person.model";
import { personCreateSchema, personUpdateSchema } from "@/schemas/person.schema";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";
import type { PersonType } from "@/generated/prisma/client/client";
import { Prisma } from "@/generated/prisma/client/client";

export async function getPersons(params?: {
  search?: string;
  type?: PersonType;
  isActive?: boolean;
}) {
  await requirePermission("persons:view");
  return personModel.findAll(params);
}

export async function getPersonById(id: string) {
  await requirePermission("persons:view");
  return personModel.findById(id);
}

export async function createPerson(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("persons:manage");

  const raw = {
    type: formData.get("type"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    cuit: formData.get("cuit"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    phone2: formData.get("phone2"),
    address: formData.get("address"),
    city: formData.get("city"),
    province: formData.get("province"),
    notes: formData.get("notes"),
  };

  const parsed = personCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const person = await personModel.create({
      type: parsed.data.type,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dni: parsed.data.dni || null,
      cuit: parsed.data.cuit || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      phone2: parsed.data.phone2 || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      notes: parsed.data.notes || null,
      createdById: session.user.id,
    });

    await logAction("Person", person.id, "CREATE", {
      newData: { type: parsed.data.type, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    }, session.user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const field = (error.meta?.target as string[])?.includes("dni") ? "DNI" : "CUIT";
      return { success: false, error: `Ya existe una persona con ese ${field}` };
    }
    throw error;
  }

  revalidatePath("/personas");
  return { success: true };
}

export async function createPersonQuick(
  _prevState: ActionResult<{ id: string; firstName: string; lastName: string }>,
  formData: FormData
): Promise<ActionResult<{ id: string; firstName: string; lastName: string }>> {
  const session = await requirePermission("persons:manage");

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();
  const dni = (formData.get("dni") as string)?.trim() || null;
  const phone = (formData.get("phone") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim() || null;

  if (!firstName || !lastName) {
    return { success: false, error: "Nombre y apellido son requeridos" };
  }

  try {
    const person = await personModel.create({
      type: "CLIENTE",
      firstName,
      lastName,
      dni,
      cuit: null,
      email,
      phone,
      phone2: null,
      address: null,
      city: null,
      province: null,
      notes: null,
      createdById: session.user.id,
    });

    await logAction("Person", person.id, "CREATE", {
      newData: { type: "CLIENTE", firstName, lastName },
    }, session.user.id);

    revalidatePath("/personas");
    return {
      success: true,
      data: { id: person.id, firstName, lastName },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Ya existe una persona con ese DNI" };
    }
    return { success: false, error: "Error al crear la persona" };
  }
}

export async function updatePerson(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("persons:manage");

  const raw = {
    id: formData.get("id"),
    type: formData.get("type"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    dni: formData.get("dni"),
    cuit: formData.get("cuit"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    phone2: formData.get("phone2"),
    address: formData.get("address"),
    city: formData.get("city"),
    province: formData.get("province"),
    notes: formData.get("notes"),
  };

  const parsed = personUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await personModel.update(parsed.data.id, {
      type: parsed.data.type,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      dni: parsed.data.dni || null,
      cuit: parsed.data.cuit || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      phone2: parsed.data.phone2 || null,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      notes: parsed.data.notes || null,
    });

    await logAction("Person", parsed.data.id, "UPDATE", {
      newData: { type: parsed.data.type, firstName: parsed.data.firstName, lastName: parsed.data.lastName },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const field = (error.meta?.target as string[])?.includes("dni") ? "DNI" : "CUIT";
      return { success: false, error: `Ya existe una persona con ese ${field}` };
    }
    throw error;
  }

  revalidatePath("/personas");
  return { success: true };
}

export async function searchPersonsForCollection(search: string) {
  await requirePermission("cash:view");
  return personModel.findForCollection(search);
}

export async function togglePersonActive(id: string): Promise<ActionResult> {
  await requirePermission("persons:manage");

  const person = await personModel.findById(id);
  if (!person) return { success: false, error: "Persona no encontrada" };

  await personModel.toggleActive(id, !person.isActive);

  await logAction("Person", id, "UPDATE", {
    oldData: { isActive: person.isActive },
    newData: { isActive: !person.isActive },
  });

  revalidatePath("/personas");
  return { success: true };
}
