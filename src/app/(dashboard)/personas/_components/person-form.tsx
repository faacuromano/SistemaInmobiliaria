"use client";

import { useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  personCreateSchema,
  type PersonCreateInput,
} from "@/schemas/person.schema";
import { createPerson, updatePerson } from "@/server/actions/person.actions";
import type { ActionResult } from "@/types/actions";
import { PersonType } from "@/types/enums";
import { PERSON_TYPE_LABELS } from "@/lib/constants";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  defaultValues?: PersonCreateInput & { id: string };
}

export function PersonForm({ defaultValues }: Props) {
  const router = useRouter();
  const isEditing = !!defaultValues;

  const serverAction = isEditing ? updatePerson : createPerson;
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => serverAction({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<PersonCreateInput>({
    resolver: zodResolver(personCreateSchema),
    defaultValues: {
      type: defaultValues?.type ?? PersonType.CLIENTE,
      firstName: defaultValues?.firstName ?? "",
      lastName: defaultValues?.lastName ?? "",
      dni: defaultValues?.dni ?? "",
      cuit: defaultValues?.cuit ?? "",
      email: defaultValues?.email ?? "",
      phone: defaultValues?.phone ?? "",
      phone2: defaultValues?.phone2 ?? "",
      address: defaultValues?.address ?? "",
      city: defaultValues?.city ?? "",
      province: defaultValues?.province ?? "",
      notes: defaultValues?.notes ?? "",
    },
  });

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(isEditing ? "Persona actualizada" : "Persona creada");
      router.push("/personas");
      router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEditing, router]);

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        {isEditing && <input type="hidden" name="id" value={defaultValues.id} />}

        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select name="type" value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(PERSON_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
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
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cuit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CUIT</FormLabel>
                    <FormControl>
                      <Input placeholder="20-12345678-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="juan@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 341 1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono 2</FormLabel>
                    <FormControl>
                      <Input placeholder="+54 341 7654321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card>
          <CardHeader>
            <CardTitle>Dirección</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Pellegrini 1234" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ciudad</FormLabel>
                    <FormControl>
                      <Input placeholder="Rosario" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="province"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provincia</FormLabel>
                    <FormControl>
                      <Input placeholder="Santa Fe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea rows={3} placeholder="Observaciones..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Guardando..." : isEditing ? "Actualizar" : "Crear Persona"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
