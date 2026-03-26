import { z } from "zod";
import { InstallmentMode } from "@/types/enums";

export const newInstallmentPlanSchema = z.object({
  saleId: z.string().min(1, "La venta es requerida"),
  totalInstallments: z.coerce.number().int().min(1, "Debe haber al menos 1 cuota"),
  installmentMode: z.nativeEnum(InstallmentMode).default(InstallmentMode.AUTOMATICO),
  firstInstallmentMonth: z.string().min(1, "El mes de primera cuota es requerido"),
  collectionDay: z.coerce.number().int().min(1).max(31, "Dia invalido"),
  manualInstallments: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        return Array.isArray(parsed) ? (parsed as Array<{ amount: string }>) : [];
      } catch {
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
        })
      )
    ),
});

export type NewInstallmentPlanInput = z.input<typeof newInstallmentPlanSchema>;
