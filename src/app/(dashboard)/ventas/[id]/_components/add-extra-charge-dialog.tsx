"use client";

import { useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { CURRENCY_LABELS } from "@/lib/constants";
import { Currency } from "@/types/enums";
import {
  extraChargeCreateSchema,
  type ExtraChargeCreateInput,
} from "@/schemas/extra-charge.schema";
import { createExtraCharge } from "@/server/actions/extra-charge.actions";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/types/actions";

const IN_KIND_TYPES = [
  { value: "INMUEBLE", label: "Inmueble" },
  { value: "TERRENO", label: "Terreno" },
  { value: "VEHICULO", label: "Vehiculo" },
  { value: "OTRO", label: "Otro" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  remainingBalance: number;
  saleCurrency: "USD" | "ARS";
}

export function AddExtraChargeDialog({ open, onOpenChange, saleId, remainingBalance, saleCurrency }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [isInKind, setIsInKind] = useState(false);
  const [inKindType, setInKindType] = useState("");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      createExtraCharge({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<ExtraChargeCreateInput>({
    resolver: zodResolver(extraChargeCreateSchema),
    defaultValues: {
      saleId,
      description: "",
      amount: "",
      currency: Currency.USD,
      dueDate: today,
      isInKind: "false",
      inKindType: "",
      notes: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        saleId,
        description: "",
        amount: "",
        currency: Currency.USD,
        dueDate: new Date().toISOString().split("T")[0],
        isInKind: "false",
        inKindType: "",
        notes: "",
      });
      setIsInKind(false);
      setInKindType("");
    }
  }, [open, saleId, form]);

  // Handle action result
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(
        isInKind
          ? "Pago en especie registrado correctamente"
          : "Refuerzo creado correctamente"
      );
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
          <DialogTitle>Nuevo Refuerzo</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5">
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="saleId" value={saleId} />
            <input type="hidden" name="isInKind" value={isInKind ? "true" : "false"} />
            <input type="hidden" name="inKindType" value={inKindType} />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Refuerzo de escrituracion"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isInKind ? "Valor cotizado" : "Monto"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    {isInKind && (
                      <p className="text-xs text-muted-foreground">
                        Valor de tasacion del bien entregado
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
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

            {/* Warning when amount exceeds remaining balance */}
            {(() => {
              const enteredAmount = parseFloat(form.watch("amount") || "0") || 0;
              if (enteredAmount > 0 && remainingBalance > 0 && enteredAmount > remainingBalance) {
                const excess = enteredAmount - remainingBalance;
                return (
                  <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                    <p className="font-medium">Monto excede el saldo pendiente</p>
                    <p className="text-xs mt-0.5">
                      El refuerzo de{" "}
                      <span className="font-semibold">{formatCurrency(enteredAmount, saleCurrency)}</span>{" "}
                      supera el saldo total de cuotas pendientes ({formatCurrency(remainingBalance, saleCurrency)}) por{" "}
                      <span className="font-semibold">{formatCurrency(excess, saleCurrency)}</span>.
                      Las cuotas restantes quedaran en $0 y se marcaran como pagadas automaticamente.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* In-kind payment toggle */}
            <div className="flex items-center gap-3">
              <Switch
                id="in-kind-toggle"
                checked={isInKind}
                onCheckedChange={setIsInKind}
              />
              <Label htmlFor="in-kind-toggle">Pago en especie</Label>
            </div>

            {isInKind && (
              <>
                <div className="space-y-2">
                  <Label>Tipo de bien entregado</Label>
                  <Select
                    value={inKindType}
                    onValueChange={setInKindType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {IN_KIND_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                  Se registra como pagado automaticamente. Indicar en las notas el detalle de lo entregado.
                </div>
              </>
            )}

            {/* Due date — hidden when in-kind */}
            {!isInKind && (
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Vencimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Hidden dueDate for in-kind (use today) */}
            {isInKind && (
              <input type="hidden" name="dueDate" value={today} />
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {isInKind ? "Detalle de entrega" : "Notas (opcional)"}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={isInKind ? 3 : 2}
                      placeholder={
                        isInKind
                          ? "Ej: Se entrego camioneta Ford Ranger 2022, patente ABC123, valuada en..."
                          : "Observaciones adicionales..."
                      }
                      required={isInKind}
                      {...field}
                    />
                  </FormControl>
                  {isInKind && !field.value && (
                    <p className="text-xs text-destructive">
                      Debe indicar que se entrego como pago en especie
                    </p>
                  )}
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
                {isPending
                  ? "Creando..."
                  : isInKind
                    ? "Registrar Pago en Especie"
                    : "Crear Refuerzo"}
              </Button>
            </div>
          </form>
        </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
