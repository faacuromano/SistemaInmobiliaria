import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { personModel } from "@/server/models/person.model";
import { Prisma } from "@/generated/prisma/client/client";
import type { PersonType } from "@/generated/prisma/client/client";

interface CreatePersonData {
  type: PersonType;
  firstName: string;
  lastName: string;
  dni?: string | null;
  cuit?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  notes?: string | null;
}

interface UpdatePersonData {
  id: string;
  type: PersonType;
  firstName: string;
  lastName: string;
  dni?: string | null;
  cuit?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  notes?: string | null;
}

function handlePrismaUniqueError(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    const field = (error.meta?.target as string[])?.includes("dni")
      ? "DNI"
      : "CUIT";
    throw new ServiceError(`Ya existe una persona con ese ${field}`);
  }
  throw error;
}

export async function createPerson(
  data: CreatePersonData,
  userId: string
): Promise<{ id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }> {
  try {
    const person = await personModel.create({
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      dni: data.dni || null,
      cuit: data.cuit || null,
      email: data.email || null,
      phone: data.phone || null,
      phone2: data.phone2 || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      notes: data.notes || null,
      createdById: userId,
    });

    await logAction("Person", person.id, "CREATE", {
      newData: { type: data.type, firstName: data.firstName, lastName: data.lastName },
    }, userId);

    return {
      id: person.id,
      firstName: data.firstName,
      lastName: data.lastName,
      dni: data.dni || null,
      phone: data.phone || null,
    };
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function updatePerson(
  data: UpdatePersonData,
  userId: string
): Promise<void> {
  try {
    await personModel.update(data.id, {
      type: data.type,
      firstName: data.firstName,
      lastName: data.lastName,
      dni: data.dni || null,
      cuit: data.cuit || null,
      email: data.email || null,
      phone: data.phone || null,
      phone2: data.phone2 || null,
      address: data.address || null,
      city: data.city || null,
      province: data.province || null,
      notes: data.notes || null,
    });

    await logAction("Person", data.id, "UPDATE", {
      newData: { type: data.type, firstName: data.firstName, lastName: data.lastName },
    }, userId);
  } catch (error) {
    handlePrismaUniqueError(error);
  }
}

export async function togglePersonActive(
  id: string,
  userId: string
): Promise<void> {
  const person = await personModel.findById(id);
  if (!person) throw new ServiceError("Persona no encontrada");

  await personModel.toggleActive(id, !person.isActive);

  await logAction("Person", id, "UPDATE", {
    oldData: { isActive: person.isActive },
    newData: { isActive: !person.isActive },
  }, userId);
}
