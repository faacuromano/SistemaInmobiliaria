"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CURRENCY_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { Price } from "@/components/shared/price";
import { Currency, PaymentMethod } from "@/types/enums";
import { payExtraCharge } from "@/server/actions/payment.actions";
import type { ActionResult } from "@/types/actions";
import { CurrencyEquivalence } from "./currency-equivalence";

const paymentFormSchema = z.object({
  amount: z
    .string()
    .min(1, "El monto es requerido")
    .transform((v) => parseFloat(v))
    .pipe(z.number().positive("El monto debe ser mayor a 0")),
  currency: z.nativeEnum(Currency),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.EFECTIVO),
  bankAccountId: z.string().optional().or(z.literal("")),
  manualRate: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? parseFloat(v) : undefined))
    .pipe(z.number().positive("La cotizacion debe ser mayor a 0").optional()),
  notes: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "La fecha es requerida"),
});

type PaymentFormInput = z.input<typeof paymentFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extraCharge: {
    id: string;
    description: string;
    amount: number;
    paidAmount: number;
    currency: string;
  };
  bankAccounts?: Array<{ id: string; name: string }>;
}

export function PayExtraChargeDialog({
  open,
  onOpenChange,
  extraCharge,
  bankAccounts = [],
}: Props) {
  const router = useRouter();
  const remaining = Math.round((extraCharge.amount - extraCharge.paidAmount) * 100) / 100;
  const today = new Date().toISOString().split("T")[0];
  const currencyCode = extraCharge.currency as "USD" | "ARS";

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      payExtraCharge({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<PaymentFormInput>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: remaining.toString(),
      currency: extraCharge.currency as Currency,
      paymentMethod: PaymentMethod.EFECTIVO,
      bankAccountId: "",
      manualRate: "",
      notes: "",
      date: today,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const currentRemaining = Math.round((extraCharge.amount - extraCharge.paidAmount) * 100) / 100;
      form.reset({
        amount: currentRemaining.toString(),
        currency: extraCharge.currency as Currency,
        paymentMethod: PaymentMethod.EFECTIVO,
        bankAccountId: "",
        manualRate: "",
        notes: "",
        date: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, extraCharge, form]);

  // Handle action result
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Pago de refuerzo registrado correctamente");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Pagar Refuerzo - {extraCharge.description}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
          <div className="mb-4 rounded-md bg-muted p-3 text-sm">
            <p>
              Monto pendiente:{" "}
              <Price amount={remaining} currency={extraCharge.currency as "USD" | "ARS"} className="font-semibold" />
            </p>
          </div>

          <Form {...form}>
            <form action={formAction} className="space-y-4">
            <input
              type="hidden"
              name="extraChargeId"
              value={extraCharge.id}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha de Pago</FormLabel>
                  <FormControl>
                    <Input type="date" max={today} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => {
                  const enteredAmount = parseFloat(field.value || "0") || 0;
                  const isOver = enteredAmount > remaining;

                  return (
                    <FormItem>
                      <FormLabel>Monto</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                        />
                      </FormControl>
                      {isOver && (
                        <p className="text-xs font-medium text-destructive">
                          El monto supera el saldo pendiente ({formatCurrency(remaining, currencyCode)})
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select
                      name="currency"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CURRENCY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Metodo de Pago</FormLabel>
                  <Select
                    name="paymentMethod"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bank account (only for TRANSFERENCIA) */}
            {form.watch("paymentMethod") === PaymentMethod.TRANSFERENCIA && bankAccounts.length > 0 && (
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cuenta Destino</FormLabel>
                    <Select
                      name="bankAccountId"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cuenta" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Currency equivalence */}
            {(() => {
              const watchedAmount = parseFloat(form.watch("amount") || "0") || 0;
              const watchedCurrency = form.watch("currency") as "USD" | "ARS";
              const watchedManualRate = form.watch("manualRate");
              const parsedManualRate = watchedManualRate ? parseFloat(watchedManualRate) : undefined;
              const validManualRate = parsedManualRate && parsedManualRate > 0 ? parsedManualRate : undefined;

              return (
                <CurrencyEquivalence
                  enteredAmount={watchedAmount}
                  enteredCurrency={watchedCurrency}
                  installmentCurrency={extraCharge.currency as "USD" | "ARS"}
                  remainingAmount={remaining}
                  manualRate={validManualRate}
                />
              );
            })()}

            {/* Partial payment warning */}
            {(() => {
              const enteredAmount = parseFloat(form.watch("amount") || "0") || 0;
              if (enteredAmount > 0 && enteredAmount < remaining) {
                const pendingAfter = remaining - enteredAmount;
                return (
                  <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <p className="font-medium">Pago parcial</p>
                    <p className="text-xs mt-0.5">
                      El monto a recibir ({formatCurrency(enteredAmount, currencyCode)}) es menor que el saldo del refuerzo ({formatCurrency(remaining, currencyCode)}).
                      Se marcara como <span className="font-semibold">Parcial</span> con un saldo restante de{" "}
                      <span className="font-semibold">{formatCurrency(pendingAfter, currencyCode)}</span>, pendiente de cancelacion para completar el pago.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <FormField
              control={form.control}
              name="manualRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cotizacion Manual (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Dejar vacio para usar cotizacion del dia"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Observaciones del pago..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Procesando..." : "Registrar Pago"}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
