import { z } from "zod";
import { Currency } from "@/types/enums";

export const extraChargeCreateSchema = z.object({
  saleId: z.string().min(1, "La venta es requerida"),
  description: z.string().min(1, "La descripcion es requerida"),
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .transform((v) => parseFloat(v))
    .pipe(z.number().positive("El monto debe ser mayor a 0")),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  isInKind: z.string().optional().transform((v) => v === "true"),
  inKindType: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const extraChargeUpdateSchema = z.object({
  description: z.string().min(1, "La descripcion es requerida").optional(),
  amount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("El monto debe ser mayor a 0").optional()),
  currency: z.nativeEnum(Currency).optional(),
  dueDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export type ExtraChargeCreateInput = z.input<typeof extraChargeCreateSchema>;
export type ExtraChargeUpdateInput = z.input<typeof extraChargeUpdateSchema>;
export type ExtraChargeCreateData = z.output<typeof extraChargeCreateSchema>;
export type ExtraChargeUpdateData = z.output<typeof extraChargeUpdateSchema>;
