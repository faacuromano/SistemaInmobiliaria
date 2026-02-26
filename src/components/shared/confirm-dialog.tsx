"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  trigger: React.ReactNode;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  title,
  description,
  onConfirm,
  trigger,
  variant = "destructive",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={loading}>
            {loading ? "Eliminando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
