import { z } from "zod";
import { Role } from "@/types/enums";

export const userCreateSchema = z.object({
  email: z.string().email("Email invalido"),
  name: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  phone: z.string().max(50).optional().or(z.literal("")),
  role: z.nativeEnum(Role),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayuscula")
    .regex(/[0-9]/, "Debe contener al menos un numero"),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  email: z.string().email("Email invalido"),
  name: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  phone: z.string().max(50).optional().or(z.literal("")),
  role: z.nativeEnum(Role),
});

export const passwordChangeSchema = z.object({
  id: z.string().min(1),
  password: z
    .string()
    .min(8, "Minimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayuscula")
    .regex(/[0-9]/, "Debe contener al menos un numero"),
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
