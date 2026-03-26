"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBankAccount,
  toggleBankAccount,
} from "@/server/actions/bank-account.actions";
import type { ActionResult } from "@/types/actions";

interface BankAccountRow {
  id: string;
  name: string;
  cbu: string | null;
  alias: string | null;
  isActive: boolean;
}

interface Props {
  accounts: BankAccountRow[];
}

export function BankAccountsSection({ accounts }: Props) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      createBankAccount({ success: false, error: "" }, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Cuenta bancaria creada");
      setShowAdd(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function handleToggle(id: string) {
    const result = await toggleBankAccount(id);
    if (result.success) {
      toast.success("Cuenta actualizada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cuentas Bancarias</CardTitle>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Agregar
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configura las cuentas bancarias disponibles para registrar pagos por
          transferencia
        </p>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay cuentas bancarias configuradas
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{account.name}</span>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    {account.cbu && <span>CBU: {account.cbu}</span>}
                    {account.alias && <span>Alias: {account.alias}</span>}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(account.id)}
                >
                  {account.isActive ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Cuenta Bancaria</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                name="name"
                placeholder="Ej: Bco. Nacion, Mercado Pago..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>CBU / CVU (opcional)</Label>
              <Input name="cbu" placeholder="CBU o CVU" />
            </div>
            <div className="space-y-2">
              <Label>Alias (opcional)</Label>
              <Input name="alias" placeholder="Alias de la cuenta" />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAdd(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creando..." : "Crear"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
