"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendMessage } from "@/server/actions/message.actions";
import type { ActionResult } from "@/types/actions";

type User = {
  id: string;
  name: string;
  lastName: string;
};

type MessageComposeDialogProps = {
  users: User[];
};

export function MessageComposeDialog({ users }: MessageComposeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    sendMessage,
    { success: false, error: "" }
  );

  useEffect(() => {
    if (state.success) {
      toast.success("Mensaje enviado correctamente");
      setOpen(false);
      setSelectedIds([]);
    } else if (state.success === false && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  const toggleRecipient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Mensaje
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo Mensaje</DialogTitle>
          <DialogDescription>
            Enviar un mensaje interno a otros usuarios
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="space-y-4 px-5 py-4">
            {/* Hidden fields for selected recipient IDs */}
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="recipientIds" value={id} />
            ))}

            <div className="space-y-2">
              <Label>Destinatarios</Label>
              <div className="flex flex-wrap gap-2 rounded-sm border p-2 min-h-[40px]">
                {selectedIds.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Selecciona destinatarios abajo
                  </span>
                )}
                {selectedIds.map((id) => {
                  const user = users.find((u) => u.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleRecipient(id)}
                      className="inline-flex items-center gap-1 rounded-sm bg-primary px-2 py-0.5 text-xs text-primary-foreground hover:bg-primary/80"
                    >
                      {user?.name} {user?.lastName}
                      <span className="ml-1">&times;</span>
                    </button>
                  );
                })}
              </div>
              <div className="max-h-32 overflow-y-auto rounded-sm border">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleRecipient(user.id)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent ${
                      selectedIds.includes(user.id)
                        ? "bg-accent text-accent-foreground"
                        : ""
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-sm border ${
                        selectedIds.includes(user.id)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    />
                    {user.name} {user.lastName}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Asunto</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Asunto del mensaje"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Mensaje</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Escribe tu mensaje..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || selectedIds.length === 0}>
              <Send className="mr-2 h-4 w-4" />
              {isPending ? "Enviando..." : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
