import { z } from "zod";

const currencyEnum = z.enum(["USD", "ARS"], {
  errorMap: () => ({ message: "Moneda invalida (USD o ARS)" }),
});

const paymentMethodEnum = z.enum(["EFECTIVO", "TRANSFERENCIA"], {
  errorMap: () => ({ message: "Metodo de pago invalido" }),
});

export const payInstallmentSchema = z.object({
  installmentId: z.string().min(1, "ID de cuota requerido"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: currencyEnum,
  paymentMethod: paymentMethodEnum.default("EFECTIVO"),
  bankAccountId: z.string().nullable().optional(),
  manualRate: z.coerce.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.coerce
    .date({ errorMap: () => ({ message: "Fecha invalida" }) })
    .refine(
      (d) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: "La fecha de pago no puede ser posterior al dia de hoy" }
    ),
});

export const payExtraChargeSchema = z.object({
  extraChargeId: z.string().min(1, "ID de cargo extra requerido"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: currencyEnum,
  paymentMethod: paymentMethodEnum.default("EFECTIVO"),
  bankAccountId: z.string().nullable().optional(),
  manualRate: z.coerce.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.coerce
    .date({ errorMap: () => ({ message: "Fecha invalida" }) })
    .refine(
      (d) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: "La fecha de pago no puede ser posterior al dia de hoy" }
    ),
});

export const recordDeliveryPaymentSchema = z.object({
  saleId: z.string().min(1, "ID de venta requerido"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  currency: currencyEnum,
  paymentMethod: paymentMethodEnum.default("EFECTIVO"),
  bankAccountId: z.string().nullable().optional(),
  manualRate: z.coerce.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.coerce
    .date({ errorMap: () => ({ message: "Fecha invalida" }) })
    .refine(
      (d) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: "La fecha de pago no puede ser posterior al dia de hoy" }
    ),
});
