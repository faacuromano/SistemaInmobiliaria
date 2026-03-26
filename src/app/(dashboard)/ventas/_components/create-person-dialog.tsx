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
import { Textarea } from "@/components/ui/textarea";
import { createPersonQuick } from "@/server/actions/person.actions";
import type { ActionResult } from "@/types/actions";
import { UserPlus } from "lucide-react";

interface CreatePersonDialogProps {
  onCreated: (person: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string | null;
    phone: string | null;
  }) => void;
}

export function CreatePersonDialog({ onCreated }: CreatePersonDialogProps) {
  const [open, setOpen] = useState(false);

  const [state, formAction, isPending] = useActionState<
    ActionResult<{
      id: string;
      firstName: string;
      lastName: string;
      dni: string | null;
      phone: string | null;
    }> | null,
    FormData
  >(
    (_prev, formData) =>
      createPersonQuick({ success: false, error: "" }, formData),
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
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => setOpen(true)}
      >
        <UserPlus className="h-4 w-4" />
        Nuevo Cliente
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>

          <form action={formAction} className="space-y-4 overflow-y-auto">
            {/* Datos personales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qp-firstName">Nombre *</Label>
                <Input
                  id="qp-firstName"
                  name="firstName"
                  placeholder="Juan"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qp-lastName">Apellido *</Label>
                <Input
                  id="qp-lastName"
                  name="lastName"
                  placeholder="Perez"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qp-dni">DNI</Label>
                <Input
                  id="qp-dni"
                  name="dni"
                  placeholder="12345678"
                  maxLength={8}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qp-cuit">CUIT</Label>
                <Input
                  id="qp-cuit"
                  name="cuit"
                  placeholder="20-12345678-9"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="space-y-1.5">
              <Label htmlFor="qp-email">Email</Label>
              <Input
                id="qp-email"
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qp-phone">Telefono</Label>
                <Input
                  id="qp-phone"
                  name="phone"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qp-phone2">Telefono 2</Label>
                <Input
                  id="qp-phone2"
                  name="phone2"
                  placeholder="+54 11 8765-4321"
                />
              </div>
            </div>

            {/* Direccion */}
            <div className="space-y-1.5">
              <Label htmlFor="qp-address">Direccion</Label>
              <Input
                id="qp-address"
                name="address"
                placeholder="Av. Pellegrini 1234"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qp-city">Ciudad</Label>
                <Input
                  id="qp-city"
                  name="city"
                  placeholder="Rosario"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qp-province">Provincia</Label>
                <Input
                  id="qp-province"
                  name="province"
                  placeholder="Santa Fe"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label htmlFor="qp-notes">Notas</Label>
              <Textarea
                id="qp-notes"
                name="notes"
                rows={2}
                placeholder="Observaciones..."
              />
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
