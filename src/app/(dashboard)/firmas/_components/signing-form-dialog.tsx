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
import { signingCreateSchema, type SigningCreateInput } from "@/schemas/signing.schema";
import { createSigning, updateSigning } from "@/server/actions/signing.actions";
import type { ActionResult } from "@/types/actions";
import { SIGNING_STATUS_LABELS } from "@/lib/constants";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
  defaultValues?: {
    id: string;
    date: string;
    time: string;
    endTime: string | null;
    lotInfo: string;
    clientName: string | null;
    lotNumbers: string | null;
    developmentId: string | null;
    sellerId: string | null;
    status: string;
    notes: string | null;
    saleId?: string | null;
    saleLabel?: string | null;
  };
}

const EMPTY_MARKER = "__none__";

export function SigningFormDialog({
  open,
  onOpenChange,
  developments,
  sellers,
  defaultValues,
}: Props) {
  const router = useRouter();
  const isEditing = !!defaultValues?.id;
  const serverAction = isEditing ? updateSigning : createSigning;

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => serverAction({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<SigningCreateInput>({
    resolver: zodResolver(signingCreateSchema),
    defaultValues: {
      date: defaultValues?.date ?? "",
      time: defaultValues?.time ?? "",
      endTime: defaultValues?.endTime ?? "",
      lotInfo: defaultValues?.lotInfo ?? "",
      clientName: defaultValues?.clientName ?? "",
      lotNumbers: defaultValues?.lotNumbers ?? "",
      developmentId: defaultValues?.developmentId ?? "",
      sellerId: defaultValues?.sellerId ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset({
        date: defaultValues?.date ?? "",
        time: defaultValues?.time ?? "",
        endTime: defaultValues?.endTime ?? "",
        lotInfo: defaultValues?.lotInfo ?? "",
        clientName: defaultValues?.clientName ?? "",
        lotNumbers: defaultValues?.lotNumbers ?? "",
        developmentId: defaultValues?.developmentId ?? "",
        sellerId: defaultValues?.sellerId ?? "",
        notes: defaultValues?.notes ?? "",
      });
    }
  }, [open, defaultValues, form]);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(isEditing ? "Firma actualizada" : "Firma creada");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Firma" : "Nueva Firma"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4 pt-2">
            {isEditing && defaultValues && <input type="hidden" name="id" value={defaultValues.id} />}
            {defaultValues?.saleId && <input type="hidden" name="saleId" value={defaultValues.saleId} />}

            {defaultValues?.saleId && defaultValues.saleLabel && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="text-muted-foreground">Venta vinculada:</span>{" "}
                <span className="font-medium">{defaultValues.saleLabel}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
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
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="lotInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Info del Lote</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Lote 101 - Mz A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lotNumbers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numeros de lote</FormLabel>
                    <FormControl>
                      <Input placeholder="101, 102" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="developmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desarrollo</FormLabel>
                    <input type="hidden" name="developmentId" value={field.value ?? ""} />
                    <Select
                      value={field.value || EMPTY_MARKER}
                      onValueChange={(v) => field.onChange(v === EMPTY_MARKER ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EMPTY_MARKER}>Sin desarrollo</SelectItem>
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
              <FormField
                control={form.control}
                name="sellerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor</FormLabel>
                    <input type="hidden" name="sellerId" value={field.value ?? ""} />
                    <Select
                      value={field.value || EMPTY_MARKER}
                      onValueChange={(v) => field.onChange(v === EMPTY_MARKER ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EMPTY_MARKER}>Sin vendedor</SelectItem>
                        {sellers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isEditing && defaultValues && (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select
                  name="status"
                  defaultValue={defaultValues.status}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(SIGNING_STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}

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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Firma"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
