"use client";

import { useActionState, useEffect } from "react";
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
import {
  cashMovementCreateSchema,
  type CashMovementCreateInput,
} from "@/schemas/cash-movement.schema";
import { createCashMovement } from "@/server/actions/cash-movement.actions";
import type { ActionResult } from "@/types/actions";
import { MovementType } from "@/types/enums";
import { MOVEMENT_TYPE_LABELS } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developments: Array<{ id: string; name: string }>;
}

// Filter out CUOTA and ENTREGA since those are created via payment actions
const MANUAL_TYPES = Object.entries(MOVEMENT_TYPE_LABELS).filter(
  ([key]) => key !== MovementType.CUOTA && key !== MovementType.ENTREGA
);

function getTodayString() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export function CreateMovementDialog({
  open,
  onOpenChange,
  developments,
}: Props) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      createCashMovement({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<CashMovementCreateInput>({
    resolver: zodResolver(cashMovementCreateSchema),
    defaultValues: {
      date: getTodayString(),
      type: MovementType.VARIOS,
      concept: "",
      developmentId: "",
      arsIncome: "",
      arsExpense: "",
      usdIncome: "",
      usdExpense: "",
      manualRate: "",
      notes: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        date: getTodayString(),
        type: MovementType.VARIOS,
        concept: "",
        developmentId: "",
        arsIncome: "",
        arsExpense: "",
        usdIncome: "",
        usdExpense: "",
        manualRate: "",
        notes: "",
      });
    }
  }, [open, form]);

  // Handle server action result
  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Movimiento creado");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Movimiento de Caja</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      name="type"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MANUAL_TYPES.map(([key, label]) => (
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

            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Descripcion del movimiento"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="developmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desarrollo (opcional)</FormLabel>
                  <Select
                    name="developmentId"
                    value={field.value || "none"}
                    onValueChange={(v) =>
                      field.onChange(v === "none" ? "" : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin desarrollo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin desarrollo</SelectItem>
                      {developments.map((dev) => (
                        <SelectItem key={dev.id} value={dev.id}>
                          {dev.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="usdIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingreso USD</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="usdExpense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Egreso USD</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="arsIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ingreso ARS</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="arsExpense"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Egreso ARS</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="manualRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cotizacion manual (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ej: 1150.00"
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
                      placeholder="Notas adicionales..."
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
                {isPending ? "Guardando..." : "Crear Movimiento"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
