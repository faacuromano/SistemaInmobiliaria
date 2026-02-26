"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { lotCreateSchema, type LotCreateInput } from "@/schemas/lot.schema";
import { createLot, updateLot } from "@/server/actions/lot.actions";
import type { ActionResult } from "@/types/actions";
import { LotStatus } from "@/types/enums";
import { LOT_STATUS_LABELS } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developmentId: string;
  defaultValues?: {
    id: string;
    lotNumber: string;
    block: string | null;
    area: number | null;
    listPrice: number | null;
    status: LotStatus;
    notes: string | null;
  };
}

// Only DISPONIBLE and RESERVADO are manually editable
const EDITABLE_STATUSES: LotStatus[] = [LotStatus.DISPONIBLE, LotStatus.RESERVADO];

export function LotFormDialog({ open, onOpenChange, developmentId, defaultValues }: Props) {
  const router = useRouter();
  const isEditing = !!defaultValues;
  const serverAction = isEditing ? updateLot : createLot;

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => serverAction({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<LotCreateInput>({
    resolver: zodResolver(lotCreateSchema),
    defaultValues: {
      developmentId,
      lotNumber: defaultValues?.lotNumber ?? "",
      block: defaultValues?.block ?? "",
      area: defaultValues?.area?.toString() ?? "",
      listPrice: defaultValues?.listPrice?.toString() ?? "",
      status: defaultValues?.status ?? LotStatus.DISPONIBLE,
      notes: defaultValues?.notes ?? "",
    },
  });

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset({
        developmentId,
        lotNumber: defaultValues?.lotNumber ?? "",
        block: defaultValues?.block ?? "",
        area: defaultValues?.area?.toString() ?? "",
        listPrice: defaultValues?.listPrice?.toString() ?? "",
        status: defaultValues?.status ?? LotStatus.DISPONIBLE,
        notes: defaultValues?.notes ?? "",
      });
    }
  }, [open, defaultValues, developmentId, form]);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(isEditing ? "Lote actualizado" : "Lote creado");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Check if status is editable (only DISPONIBLE/RESERVADO)
  const isStatusEditable = !defaultValues || EDITABLE_STATUSES.includes(defaultValues.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Lote" : "Nuevo Lote"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction}>
            <div className="space-y-4 px-5 py-4">
              <input type="hidden" name="developmentId" value={developmentId} />
              {isEditing && <input type="hidden" name="id" value={defaultValues.id} />}
              {/* Always submit status via hidden input — disabled Select does not include value in FormData */}
              <input type="hidden" name="status" value={form.watch("status")} />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lotNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero de Lote</FormLabel>
                      <FormControl>
                        <Input placeholder="101" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="block"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Manzana</FormLabel>
                      <FormControl>
                        <Input placeholder="A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superficie (m2)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="250.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="listPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio Lista (USD)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="15000.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!isStatusEditable}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isStatusEditable
                          ? EDITABLE_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {LOT_STATUS_LABELS[s]}
                              </SelectItem>
                            ))
                          : Object.entries(LOT_STATUS_LABELS).map(([key, label]) => (
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

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Textarea rows={2} placeholder="Notas adicionales..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Lote"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
