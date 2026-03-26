"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { personModel } from "@/server/models/person.model";
import { personCreateSchema, personUpdateSchema } from "@/schemas/person.schema";
import * as personService from "@/server/services/person.service";
import type { ActionResult } from "@/types/actions";
import type { PersonType } from "@/generated/prisma/client/client";

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
    await personService.createPerson(parsed.data, session.user.id);
    revalidatePath("/personas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la persona" };
  }
}

export async function createPersonQuick(
  _prevState: ActionResult<{ id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }>,
  formData: FormData
): Promise<ActionResult<{ id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }>> {
  const session = await requirePermission("persons:manage");

  const firstName = (formData.get("firstName") as string)?.trim();
  const lastName = (formData.get("lastName") as string)?.trim();

  if (!firstName || !lastName) {
    return { success: false, error: "Nombre y apellido son requeridos" };
  }

  try {
    const result = await personService.createPerson(
      {
        type: "CLIENTE",
        firstName,
        lastName,
        dni: (formData.get("dni") as string)?.trim() || null,
        cuit: (formData.get("cuit") as string)?.trim() || null,
        phone: (formData.get("phone") as string)?.trim() || null,
        phone2: (formData.get("phone2") as string)?.trim() || null,
        email: (formData.get("email") as string)?.trim() || null,
        address: (formData.get("address") as string)?.trim() || null,
        city: (formData.get("city") as string)?.trim() || null,
        province: (formData.get("province") as string)?.trim() || null,
        notes: (formData.get("notes") as string)?.trim() || null,
      },
      session.user.id
    );

    revalidatePath("/personas");
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la persona" };
  }
}

export async function updatePerson(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("persons:manage");

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
    await personService.updatePerson(parsed.data, session.user.id);
    revalidatePath("/personas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar la persona" };
  }
}

export async function searchPersonsForCollection(search: string) {
  await requirePermission("cash:view");
  return personModel.findForCollection(search);
}

export async function togglePersonActive(id: string): Promise<ActionResult> {
  const session = await requirePermission("persons:manage");

  try {
    await personService.togglePersonActive(id, session.user.id);
    revalidatePath("/personas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar estado de la persona" };
  }
}
