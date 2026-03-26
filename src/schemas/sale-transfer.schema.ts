import { z } from "zod";

export const saleTransferSchema = z.object({
  saleId: z.string().min(1, "La venta es requerida"),
  toPersonId: z.string().min(1, "El nuevo cliente es requerido"),
  transferDate: z.string().min(1, "La fecha de transferencia es requerida"),
  renegotiate: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === "true")
    .default(false),
  newInstallments: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({ code: "custom", message: "Las cuotas deben ser un array" });
          return [];
        }
        return parsed as Array<{ amount: string; dueDate: string }>;
      } catch {
        ctx.addIssue({ code: "custom", message: "JSON de cuotas invalido" });
        return [];
      }
    })
    .pipe(
      z.array(
        z.object({
          amount: z
            .string()
            .min(1)
            .transform((v) => parseFloat(v))
            .pipe(z.number().positive("El monto debe ser mayor a 0")),
          dueDate: z.string().min(1, "La fecha es requerida"),
        })
      )
    ),
  notes: z.string().optional().or(z.literal("")),
});

export type SaleTransferInput = z.input<typeof saleTransferSchema>;
