"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeUserPassword } from "@/server/actions/user.actions";
import type { ActionResult } from "@/types/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function ChangePasswordDialog({ open, onOpenChange, userId, userName }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");

  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => changeUserPassword({ success: false, error: "" }, formData),
    null
  );

  // Reset fields when dialog opens
  useEffect(() => {
    if (open) {
      setPassword("");
      setConfirmPassword("");
      setClientError("");
    }
  }, [open]);

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Contrasena actualizada");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleSubmit(formData: FormData) {
    setClientError("");

    const pwd = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (pwd.length < 6) {
      setClientError("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    if (pwd !== confirm) {
      setClientError("Las contrasenas no coinciden");
      return;
    }

    formAction(formData);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contrasena</DialogTitle>
          <DialogDescription>
            Cambiar la contrasena de {userName}
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={userId} />

          <div className="space-y-2">
            <Label htmlFor="password">Nueva contrasena</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Minimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contrasena</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repetir contrasena"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {clientError && (
            <p className="text-sm text-destructive">{clientError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : "Cambiar contrasena"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
