import { z } from "zod";
import { SaleStatus, Currency, InstallmentMode, CesionType } from "@/types/enums";

export const saleCreateSchema = z.object({
  lotId: z.string().min(1, "El lote es requerido"),
  personId: z.string().min(1, "El comprador es requerido"),
  sellerId: z.string().optional().or(z.literal("")),
  saleDate: z.string().min(1, "La fecha es requerida"),
  totalPrice: z
    .string()
    .min(1, "El precio es requerido")
    .transform((v) => parseFloat(v))
    .pipe(z.number().finite("Precio invalido").min(0, "El precio debe ser mayor o igual a 0")),
  downPayment: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().finite("Entrega invalida").nonnegative().optional()),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  totalInstallments: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0, "Las cuotas deben ser 0 o más")),
  firstInstallmentAmount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().finite().positive().optional()),
  regularInstallmentAmount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().finite().positive().optional()),
  firstInstallmentMonth: z.string().optional().or(z.literal("")),
  collectionDay: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseInt(v, 10) : undefined))
    .pipe(z.number().int().min(1).max(31).optional()),
  commissionAmount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().finite().nonnegative().optional()),
  exchangeRateOverride: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().finite().positive().optional()),
  installmentMode: z.nativeEnum(InstallmentMode).default(InstallmentMode.AUTOMATICO),
  manualInstallments: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({ code: "custom", message: "Las cuotas manuales deben ser un array" });
          return [];
        }
        return parsed as Array<{ amount: string }>;
      } catch {
        ctx.addIssue({ code: "custom", message: "JSON de cuotas manuales invalido" });
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
  status: z.nativeEnum(SaleStatus).default(SaleStatus.ACTIVA),
  cesionType: z.nativeEnum(CesionType).optional(),
  cesionDetail: z.string().optional().or(z.literal("")),
  signingDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  paymentWindow: z.string().optional().or(z.literal("")),
  extraCharges: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        const parsed = JSON.parse(v);
        if (!Array.isArray(parsed)) {
          ctx.addIssue({ code: "custom", message: "Los refuerzos deben ser un array" });
          return [];
        }
        return parsed as Array<{
          description: string;
          amount: string;
          dueDate: string;
          notes?: string;
        }>;
      } catch {
        ctx.addIssue({ code: "custom", message: "JSON de refuerzos invalido" });
        return [];
      }
    })
    .pipe(
      z.array(
        z.object({
          description: z.string().min(1, "La descripcion es requerida"),
          amount: z
            .string()
            .min(1)
            .transform((v) => parseFloat(v))
            .pipe(z.number().positive("El monto debe ser mayor a 0")),
          dueDate: z.string().min(1, "La fecha es requerida"),
          notes: z.string().optional().or(z.literal("")),
        })
      )
    ),
});

export type SaleCreateInput = z.input<typeof saleCreateSchema>;
