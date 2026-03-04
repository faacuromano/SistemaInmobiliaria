"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPersonQuick } from "@/server/actions/person.actions";
import type { ActionResult } from "@/types/actions";
import { UserPlus } from "lucide-react";

interface CreatePersonDialogProps {
  onCreated: (person: { id: string; firstName: string; lastName: string }) => void;
}

export function CreatePersonDialog({ onCreated }: CreatePersonDialogProps) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ id: string; firstName: string; lastName: string }> | null,
    FormData
  >(
    (_prev, formData) =>
      createPersonQuick(
        { success: false, error: "" },
        formData
      ),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success && state.data) {
      toast.success("Cliente creado exitosamente");
      onCreated(state.data);
      setOpen(false);
    } else if (!state.success) {
      toast.error(state.error);
    }
  }, [state, onCreated]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => setOpen(true)}
        title="Crear nuevo cliente"
      >
        <UserPlus className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qp-firstName">Nombre *</Label>
                <Input
                  id="qp-firstName"
                  name="firstName"
                  placeholder="Nombre"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qp-lastName">Apellido *</Label>
                <Input
                  id="qp-lastName"
                  name="lastName"
                  placeholder="Apellido"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qp-dni">DNI (opcional)</Label>
              <Input
                id="qp-dni"
                name="dni"
                placeholder="12345678"
                maxLength={8}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qp-phone">Telefono (opcional)</Label>
                <Input
                  id="qp-phone"
                  name="phone"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qp-email">Email (opcional)</Label>
                <Input
                  id="qp-email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creando..." : "Crear Cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
