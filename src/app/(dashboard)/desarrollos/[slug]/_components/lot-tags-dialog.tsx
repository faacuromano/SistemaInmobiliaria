"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { setLotTags } from "@/server/actions/tag.actions";
import type { TagInfo, TagWithCount } from "./lots-section";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lot: {
    id: string;
    lotNumber: string;
    tags: TagInfo[];
  };
  allTags: TagWithCount[];
}

export function LotTagsDialog({ open, onOpenChange, lot, allTags }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(lot.tags.map((t) => t.id))
  );

  function toggleTag(tagId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setLotTags(lot.id, Array.from(selectedIds));
      if (result.success) {
        toast.success("Etiquetas actualizadas");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Etiquetas del Lote {lot.lotNumber}</DialogTitle>
          <DialogDescription>
            Selecciona las etiquetas para este lote.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {allTags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay etiquetas disponibles. Crea una desde &quot;Gestionar Etiquetas&quot;.
            </p>
          ) : (
            allTags.map((tag) => {
              const isSelected = selectedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                  style={
                    isSelected && tag.color
                      ? { borderColor: tag.color }
                      : undefined
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  <div
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border"
                    style={
                      isSelected
                        ? {
                            backgroundColor: tag.color ?? "hsl(var(--primary))",
                            borderColor: tag.color ?? "hsl(var(--primary))",
                          }
                        : undefined
                    }
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <Badge
                    variant="outline"
                    style={
                      tag.color
                        ? { borderColor: tag.color, color: tag.color }
                        : undefined
                    }
                  >
                    {tag.label}
                  </Badge>
                </button>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
