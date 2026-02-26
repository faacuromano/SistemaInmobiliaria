"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateMovementDialog } from "./create-movement-dialog";

interface Props {
  developments: Array<{ id: string; name: string }>;
}

export function CajaActions({ developments }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nuevo Movimiento
      </Button>
      <CreateMovementDialog
        open={open}
        onOpenChange={setOpen}
        developments={developments}
      />
    </>
  );
}
