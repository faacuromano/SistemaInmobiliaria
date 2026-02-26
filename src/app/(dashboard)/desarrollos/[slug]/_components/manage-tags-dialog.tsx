"use client";

import { useState, useActionState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { createTag, updateTag, deleteTag } from "@/server/actions/tag.actions";
import type { ActionResult } from "@/types/actions";
import type { TagWithCount } from "./lots-section";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: TagWithCount[];
}

const PRESET_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6B7280", // gray
];

export function ManageTagsDialog({ open, onOpenChange, tags }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [editingTag, setEditingTag] = useState<TagWithCount | null>(null);
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("");

  // Create action
  const [createState, createAction, isCreating] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => createTag({ success: false, error: "" }, formData),
    null
  );

  // Update action — we need to bind the id
  const [updateState, updateAction, isUpdating] = useActionState<ActionResult | null, FormData>(
    (_prev, formData) => {
      if (!editingTag) return Promise.resolve({ success: false, error: "No tag selected" } as ActionResult);
      return updateTag(editingTag.id, { success: false, error: "" }, formData);
    },
    null
  );

  useEffect(() => {
    if (createState?.success) {
      toast.success("Etiqueta creada");
      resetForm();
      router.refresh();
    } else if (createState && !createState.success) {
      toast.error(createState.error);
    }
  }, [createState, router]);

  useEffect(() => {
    if (updateState?.success) {
      toast.success("Etiqueta actualizada");
      resetForm();
      router.refresh();
    } else if (updateState && !updateState.success) {
      toast.error(updateState.error);
    }
  }, [updateState, router]);

  function resetForm() {
    setMode("list");
    setEditingTag(null);
    setLabel("");
    setColor("");
  }

  function startCreate() {
    setMode("create");
    setEditingTag(null);
    setLabel("");
    setColor("");
  }

  function startEdit(tag: TagWithCount) {
    setMode("edit");
    setEditingTag(tag);
    setLabel(tag.label);
    setColor(tag.color ?? "");
  }

  async function handleDelete(id: string) {
    const result = await deleteTag(id);
    if (result.success) {
      toast.success("Etiqueta eliminada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  }

  const isPending = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "list" && "Gestionar Etiquetas"}
            {mode === "create" && "Nueva Etiqueta"}
            {mode === "edit" && "Editar Etiqueta"}
          </DialogTitle>
          <DialogDescription>
            {mode === "list" && "Crea, edita o elimina etiquetas para clasificar lotes."}
            {mode === "create" && "Ingresa el nombre y color de la nueva etiqueta."}
            {mode === "edit" && "Modifica el nombre o color de la etiqueta."}
          </DialogDescription>
        </DialogHeader>

        {mode === "list" ? (
          <div className="space-y-3">
            <div className="max-h-64 overflow-y-auto space-y-2">
              {tags.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay etiquetas creadas.
                </p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between rounded-sm border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
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
                      <span className="text-xs text-muted-foreground">
                        {tag._count.lots} {tag._count.lots === 1 ? "lote" : "lotes"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(tag)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <ConfirmDialog
                        title="Eliminar etiqueta"
                        description={`Se eliminara la etiqueta "${tag.label}" y se desvinculara de ${tag._count.lots} lote(s).`}
                        onConfirm={() => handleDelete(tag.id)}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            <Button onClick={startCreate} className="w-full" variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Etiqueta
            </Button>
          </div>
        ) : (
          <form
            action={mode === "create" ? createAction : updateAction}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre</label>
              <Input
                name="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: Esquina, Premium, Frente al parque"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="h-7 w-7 rounded-sm border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#000" : "transparent",
                    }}
                    onClick={() => setColor(color === c ? "" : c)}
                  />
                ))}
                {color && !PRESET_COLORS.includes(color) && (
                  <button
                    type="button"
                    className="h-7 w-7 rounded-sm border-2"
                    style={{ backgroundColor: color, borderColor: "#000" }}
                    onClick={() => setColor("")}
                  />
                )}
              </div>
              <Input
                name="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#FF5733 (opcional)"
                maxLength={7}
              />
            </div>
            {/* Preview */}
            {label && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Vista previa</label>
                <div>
                  <Badge
                    variant="outline"
                    style={
                      color
                        ? { borderColor: color, color: color }
                        : undefined
                    }
                  >
                    {label}
                  </Badge>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Guardando..."
                  : mode === "create"
                    ? "Crear Etiqueta"
                    : "Actualizar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
