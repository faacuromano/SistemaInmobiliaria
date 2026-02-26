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
import { createUser, updateUser } from "@/server/actions/user.actions";
import type { ActionResult } from "@/types/actions";
import { Role } from "@/types/enums";
import { ROLE_LABELS } from "@/lib/constants";

// Combined schema that works for both create and edit
// Password is optional so it works for edit mode too
const userFormSchema = z.object({
  id: z.string().optional(),
  email: z.string().email("Email invalido"),
  name: z.string().min(1, "El nombre es requerido").max(100),
  lastName: z.string().min(1, "El apellido es requerido").max(100),
  phone: z.string().max(50).optional().or(z.literal("")),
  role: z.nativeEnum(Role),
  password: z.string().optional().or(z.literal("")),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: {
    id: string;
    email: string;
    name: string;
    lastName: string;
    phone: string | null;
    role: string;
  };
}

export function UserFormDialog({ open, onOpenChange, defaultValues }: Props) {
  const router = useRouter();
  const isEditing = !!defaultValues;
  const serverAction = isEditing ? updateUser : createUser;

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => serverAction({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      id: defaultValues?.id ?? "",
      email: defaultValues?.email ?? "",
      name: defaultValues?.name ?? "",
      lastName: defaultValues?.lastName ?? "",
      phone: defaultValues?.phone ?? "",
      role: (defaultValues?.role as Role) ?? Role.ADMINISTRACION,
      password: "",
    },
  });

  // Reset form when dialog opens/closes or defaultValues change
  useEffect(() => {
    if (open) {
      form.reset({
        id: defaultValues?.id ?? "",
        email: defaultValues?.email ?? "",
        name: defaultValues?.name ?? "",
        lastName: defaultValues?.lastName ?? "",
        phone: defaultValues?.phone ?? "",
        role: (defaultValues?.role as Role) ?? Role.ADMINISTRACION,
        password: "",
      });
    }
  }, [open, defaultValues, form]);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(isEditing ? "Usuario actualizado" : "Usuario creado");
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
          <DialogTitle>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            {isEditing && <input type="hidden" name="id" value={defaultValues.id} />}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
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
                      <Input placeholder="Perez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="juan@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="+54 11 1234-5678" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    name="role"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([key, label]) => (
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

            {!isEditing && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contrasena</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Minimo 6 caracteres"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar"
                    : "Crear Usuario"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
