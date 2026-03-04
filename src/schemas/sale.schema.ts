import { z } from "zod";
import { SaleStatus, Currency } from "@/types/enums";

export const saleCreateSchema = z.object({
  lotId: z.string().min(1, "El lote es requerido"),
  personId: z.string().min(1, "El comprador es requerido"),
  sellerId: z.string().optional().or(z.literal("")),
  saleDate: z.string().min(1, "La fecha es requerida"),
  totalPrice: z
    .string()
    .min(1, "El precio es requerido")
    .transform((v) => parseFloat(v))
    .pipe(z.number().min(0, "El precio debe ser mayor o igual a 0")),
  downPayment: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined)),
  currency: z.nativeEnum(Currency).default(Currency.USD),
  totalInstallments: z
    .string()
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(0, "Las cuotas deben ser 0 o más")),
  firstInstallmentAmount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined)),
  regularInstallmentAmount: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined)),
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
    .transform((v) => (v ? parseFloat(v) : undefined)),
  status: z.nativeEnum(SaleStatus).default(SaleStatus.ACTIVA),
  signingDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  paymentWindow: z.string().optional().or(z.literal("")),
  extraCharges: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return [];
      try {
        return JSON.parse(v) as Array<{
          description: string;
          amount: string;
          dueDate: string;
          notes?: string;
        }>;
      } catch {
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
