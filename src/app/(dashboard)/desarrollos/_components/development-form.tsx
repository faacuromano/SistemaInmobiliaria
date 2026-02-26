"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  developmentCreateSchema,
  type DevelopmentCreateInput,
} from "@/schemas/development.schema";
import {
  createDevelopment,
  updateDevelopment,
} from "@/server/actions/development.actions";
import type { ActionResult } from "@/types/actions";
import { DevelopmentStatus, DevelopmentType } from "@/types/enums";
import { DEVELOPMENT_STATUS_LABELS, DEVELOPMENT_TYPE_LABELS } from "@/lib/constants";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  defaultValues?: Omit<DevelopmentCreateInput, "totalLots"> & { id: string; slug: string; googleMapsUrl?: string };
}

export function DevelopmentForm({ defaultValues }: Props) {
  const router = useRouter();
  const isEditing = !!defaultValues;

  const serverAction = isEditing ? updateDevelopment : createDevelopment;
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => serverAction({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<DevelopmentCreateInput>({
    resolver: zodResolver(developmentCreateSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      location: defaultValues?.location ?? "",
      googleMapsUrl: defaultValues?.googleMapsUrl ?? "",
      type: defaultValues?.type ?? DevelopmentType.INMOBILIARIO,
      status: defaultValues?.status ?? DevelopmentStatus.EN_CURSO,
      ...(!isEditing && { totalLots: 0 }),
    },
  });

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(isEditing ? "Desarrollo actualizado" : "Desarrollo creado");
      router.push("/desarrollos");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEditing, router]);

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            {isEditing && <input type="hidden" name="id" value={defaultValues.id} />}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Raíces de Alvear" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select name="type" value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DEVELOPMENT_TYPE_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select name="status" value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(DEVELOPMENT_STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicacion</FormLabel>
                  <FormControl>
                    <Input placeholder="Ciudad, Provincia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="googleMapsUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Maps URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://maps.google.com/..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Pega el enlace de Google Maps para ubicar el desarrollo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descripción del desarrollo..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="totalLots"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de Lotes/Casas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={500}
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormDescription>
                      Se crearán lotes numerados automáticamente (Lote 1, Lote 2, etc.)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isPending}>
                {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Desarrollo"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
