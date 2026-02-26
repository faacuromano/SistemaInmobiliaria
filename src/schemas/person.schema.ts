import { z } from "zod";
import { PersonType } from "@/types/enums";

export const personCreateSchema = z.object({
  type: z.nativeEnum(PersonType),
  firstName: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  dni: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().regex(/^\d{7,8}$/, "DNI debe tener 7 u 8 dígitos").optional()),
  cuit: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined))
    .pipe(z.string().regex(/^\d{2}-\d{8}-\d{1}$/, "CUIT debe ser XX-XXXXXXXX-X").optional()),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  phone2: z.string().max(50).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  province: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const personUpdateSchema = personCreateSchema.extend({
  id: z.string().min(1),
});

export type PersonCreateInput = z.infer<typeof personCreateSchema>;
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>;
