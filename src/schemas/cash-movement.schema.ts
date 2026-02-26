import { z } from "zod";
import { MovementType } from "@/types/enums";

export const cashMovementCreateSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  type: z.nativeEnum(MovementType),
  concept: z.string().min(1, "El concepto es requerido").max(200),
  detail: z.string().optional().or(z.literal("")),
  developmentId: z.string().optional().or(z.literal("")),
  personId: z.string().optional().or(z.literal("")),
  saleId: z.string().optional().or(z.literal("")),
  installmentId: z.string().optional().or(z.literal("")),
  extraChargeId: z.string().optional().or(z.literal("")),
  arsIncome: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("El monto debe ser mayor a 0").optional()),
  arsExpense: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("El monto debe ser mayor a 0").optional()),
  usdIncome: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("El monto debe ser mayor a 0").optional()),
  usdExpense: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("El monto debe ser mayor a 0").optional()),
  manualRate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("La cotizacion debe ser mayor a 0").optional()),
  notes: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  const hasArs = (data.arsIncome != null && data.arsIncome > 0) || (data.arsExpense != null && data.arsExpense > 0);
  const hasUsd = (data.usdIncome != null && data.usdIncome > 0) || (data.usdExpense != null && data.usdExpense > 0);

  if (!hasArs && !hasUsd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Debe ingresar al menos un monto (ARS o USD)",
      path: ["arsIncome"],
    });
  }

  // CAMBIO (currency exchange) legitimately uses both currencies
  if (hasArs && hasUsd && data.type !== MovementType.CAMBIO) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Un movimiento debe ser en una sola moneda (ARS o USD), no ambas. Use tipo CAMBIO para conversiones.",
      path: ["usdIncome"],
    });
  }

  if (data.arsIncome != null && data.arsIncome > 0 && data.arsExpense != null && data.arsExpense > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Un movimiento no puede ser ingreso y egreso ARS a la vez",
      path: ["arsExpense"],
    });
  }

  if (data.usdIncome != null && data.usdIncome > 0 && data.usdExpense != null && data.usdExpense > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Un movimiento no puede ser ingreso y egreso USD a la vez",
      path: ["usdExpense"],
    });
  }
});

export type CashMovementCreateInput = z.input<typeof cashMovementCreateSchema>;
