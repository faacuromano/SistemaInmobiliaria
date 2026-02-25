"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  businessHoursSchema,
  type BusinessHoursInput,
} from "@/schemas/business-hours.schema";
import { updateBusinessHours } from "@/server/actions/business-hours.actions";
import type { BusinessHoursConfig } from "@/lib/business-hours";

interface Props {
  config: BusinessHoursConfig;
}

const DAY_OPTIONS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miercoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sabado" },
  { value: 0, label: "Domingo" },
];

export function BusinessHoursSection({ config }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<BusinessHoursInput>({
    resolver: zodResolver(businessHoursSchema),
    defaultValues: {
      openingTime: config.openingTime,
      closingTime: config.closingTime,
      breaks: config.breaks,
      enabledDays: config.enabledDays,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "breaks",
  });

  const enabledDays = form.watch("enabledDays");

  const onSubmit = form.handleSubmit(async (values) => {
    setIsPending(true);
    try {
      const formData = new FormData();
      formData.set("business_hours_json", JSON.stringify(values));
      const result = await updateBusinessHours(null, formData);
      if (result.success) {
        toast.success("Horarios guardados");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Error al guardar los horarios");
    } finally {
      setIsPending(false);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horario Laboral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="openingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de apertura</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="closingTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de cierre</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descansos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <FormField
                  control={form.control}
                  name={`breaks.${index}.label`}
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      {index === 0 && <FormLabel>Nombre</FormLabel>}
                      <FormControl>
                        <Input placeholder="Almuerzo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`breaks.${index}.startTime`}
                  render={({ field }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Inicio</FormLabel>}
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`breaks.${index}.endTime`}
                  render={({ field }) => (
                    <FormItem>
                      {index === 0 && <FormLabel>Fin</FormLabel>}
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            {form.formState.errors.breaks?.root?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.breaks.root.message}
              </p>
            )}
            {!form.formState.errors.breaks?.root?.message &&
              form.formState.errors.breaks?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.breaks.message}
                </p>
              )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ label: "", startTime: "", endTime: "" })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar descanso
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dias Habilitados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DAY_OPTIONS.map((day) => (
              <div
                key={day.value}
                className="flex items-center justify-between"
              >
                <Label>{day.label}</Label>
                <Switch
                  checked={enabledDays.includes(day.value)}
                  onCheckedChange={(checked) => {
                    const newDays = checked
                      ? [...enabledDays, day.value].sort((a, b) => a - b)
                      : enabledDays.filter((d) => d !== day.value);
                    form.setValue("enabledDays", newDays, {
                      shouldValidate: true,
                    });
                  }}
                />
              </div>
            ))}

            {form.formState.errors.enabledDays?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.enabledDays.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar Horarios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
