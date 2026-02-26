"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SigningFormDialog } from "./signing-form-dialog";

interface Props {
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
}

export function SigningsActions({ developments, sellers }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Nueva Firma
      </Button>
      <SigningFormDialog
        open={open}
        onOpenChange={setOpen}
        developments={developments}
        sellers={sellers}
      />
    </>
  );
}
