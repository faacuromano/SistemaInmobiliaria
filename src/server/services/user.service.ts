import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { userModel } from "@/server/models/user.model";
import { Prisma } from "@/generated/prisma/client/client";
import bcrypt from "bcryptjs";

interface CreateUserData {
  email: string;
  name: string;
  lastName: string;
  role: string;
  password: string;
  phone?: string | null;
}

interface UpdateUserData {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: string;
  phone?: string | null;
}

export async function createUser(
  data: CreateUserData,
  userId: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(data.password, 10);

  try {
    const user = await userModel.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      lastName: data.lastName,
      role: data.role,
      phone: data.phone || null,
    });

    await logAction("User", user.id, "CREATE", {
      newData: { email: data.email, name: data.name, lastName: data.lastName, role: data.role },
    }, userId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ServiceError("Ya existe un usuario con ese email");
    }
    console.error("Error al crear usuario:", error);
    throw new ServiceError("Error al crear el usuario");
  }
}

export async function updateUser(
  data: UpdateUserData,
  userId: string
): Promise<void> {
  try {
    await userModel.update(data.id, {
      email: data.email,
      name: data.name,
      lastName: data.lastName,
      role: data.role,
      phone: data.phone || null,
    });

    await logAction("User", data.id, "UPDATE", {
      newData: { email: data.email, name: data.name, lastName: data.lastName, role: data.role },
    }, userId);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ServiceError("Ya existe un usuario con ese email");
    }
    console.error("Error al actualizar usuario:", error);
    throw new ServiceError("Error al actualizar el usuario");
  }
}

export async function changeUserPassword(
  id: string,
  password: string,
  userId: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(password, 10);
  await userModel.updatePassword(id, hashedPassword);

  await logAction("User", id, "UPDATE", {
    newData: { passwordChanged: true },
  }, userId);
}

export async function toggleUserActive(
  id: string,
  userId: string
): Promise<void> {
  const user = await userModel.findById(id);
  if (!user) throw new ServiceError("Usuario no encontrado");

  await userModel.toggleActive(id, !user.isActive);

  await logAction("User", id, "UPDATE", {
    oldData: { isActive: user.isActive },
    newData: { isActive: !user.isActive },
  }, userId);
}

export async function toggleUserSeller(
  id: string,
  userId: string
): Promise<void> {
  const user = await userModel.findById(id);
  if (!user) throw new ServiceError("Usuario no encontrado");

  await userModel.toggleSeller(id, !user.isSeller);

  await logAction("User", id, "UPDATE", {
    oldData: { isSeller: user.isSeller },
    newData: { isSeller: !user.isSeller },
  }, userId);
}

export async function updateUserCommission(
  id: string,
  rate: number | null,
  userId: string
): Promise<void> {
  const user = await userModel.findById(id);
  if (!user) throw new ServiceError("Usuario no encontrado");

  await userModel.updateCommissionRate(id, rate);

  await logAction("User", id, "UPDATE", {
    oldData: { commissionRate: user.commissionRate ? Number(user.commissionRate) : null },
    newData: { commissionRate: rate },
  }, userId);
}
