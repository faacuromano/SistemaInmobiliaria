"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SIGNING_STATUS_LABELS } from "@/lib/constants";
import { updateSigningStatus } from "@/server/actions/signing.actions";
import type { SigningStatus } from "@/types/enums";

interface Props {
  signingId: string;
  currentStatus: string;
}

export function SigningStatusSelect({ signingId, currentStatus }: Props) {
  const router = useRouter();

  async function handleChange(newStatus: string) {
    if (newStatus === currentStatus) return;

    const result = await updateSigningStatus(signingId, newStatus as SigningStatus);
    if (result.success) {
      toast.success("Estado actualizado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SIGNING_STATUS_LABELS).map(([key, label]) => (
          <SelectItem key={key} value={key}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
