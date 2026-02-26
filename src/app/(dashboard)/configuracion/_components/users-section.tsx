"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, KeyRound, UserX, UserCheck, Plus, Percent } from "lucide-react";
import { toggleUserActive, toggleUserSeller, updateUserCommission } from "@/server/actions/user.actions";
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { UsersFilters } from "./users-filters";
import { UserFormDialog } from "./user-form-dialog";
import { ChangePasswordDialog } from "./change-password-dialog";
import type { Role } from "@/types/enums";

type UserRow = {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: string;
  isActive: boolean;
  isSeller: boolean;
  commissionRate: number | null;
  phone: string | null;
  createdAt: Date;
};

interface Props {
  users: UserRow[];
  canManage: boolean;
}

export function UsersSection({ users, canManage }: Props) {
  const router = useRouter();
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<{ id: string; name: string } | null>(null);

  function handleNew() {
    setEditingUser(null);
    setFormDialogOpen(true);
  }

  function handleEdit(user: UserRow) {
    setEditingUser(user);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);
    if (!open) setEditingUser(null);
  }

  function handleChangePassword(user: UserRow) {
    setPasswordUser({ id: user.id, name: `${user.name} ${user.lastName}` });
    setPasswordDialogOpen(true);
  }

  function handlePasswordDialogChange(open: boolean) {
    setPasswordDialogOpen(open);
    if (!open) setPasswordUser(null);
  }

  async function handleToggleActive(user: UserRow) {
    const result = await toggleUserActive(user.id);
    if (result.success) {
      toast.success(user.isActive ? "Usuario desactivado" : "Usuario activado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleToggleSeller(user: UserRow) {
    const result = await toggleUserSeller(user.id);
    if (result.success) {
      toast.success(user.isSeller ? "Vendedor desactivado" : "Marcado como vendedor");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  async function handleCommissionChange(userId: string, value: string) {
    const rate = value === "" ? null : parseFloat(value);
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
      toast.error("La comision debe ser un valor entre 0 y 100");
      return;
    }
    const result = await updateUserCommission(userId, rate);
    if (result.success) {
      toast.success("Comision actualizada");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      label: "Nombre",
      render: (user) => (
        <span className="font-medium">
          {user.name} {user.lastName}
        </span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (user) => user.email,
    },
    {
      key: "role",
      label: "Rol",
      render: (user) => (
        <StatusBadge
          label={ROLE_LABELS[user.role as Role]}
          variant={ROLE_COLORS[user.role as Role]}
        />
      ),
    },
    {
      key: "phone",
      label: "Telefono",
      render: (user) => user.phone ?? "—",
    },
    {
      key: "isActive",
      label: "Estado",
      render: (user) => (
        <StatusBadge
          label={user.isActive ? "Activo" : "Inactivo"}
          variant={user.isActive ? "default" : "destructive"}
        />
      ),
    },
    {
      key: "isSeller",
      label: "Vendedor",
      render: (user) =>
        canManage ? (
          <Switch
            checked={user.isSeller}
            onCheckedChange={() => handleToggleSeller(user)}
            aria-label={`Marcar como vendedor a ${user.name}`}
          />
        ) : (
          user.isSeller ? (
            <Badge variant="default">Vendedor</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        ),
    },
    {
      key: "commissionRate",
      label: "Comision %",
      render: (user) =>
        user.isSeller ? (
          canManage ? (
            <CommissionInput
              userId={user.id}
              defaultValue={user.commissionRate}
              onSave={handleCommissionChange}
            />
          ) : (
            <span>{user.commissionRate !== null ? `${user.commissionRate}%` : "—"}</span>
          )
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "createdAt",
      label: "Creado",
      render: (user) => formatDate(user.createdAt),
    },
  ];

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-12",
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(user)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleChangePassword(user)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Cambiar contrasena
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ConfirmDialog
              title={user.isActive ? "Desactivar usuario" : "Activar usuario"}
              description={
                user.isActive
                  ? `¿Estas seguro de desactivar a ${user.name} ${user.lastName}? No podra acceder al sistema.`
                  : `¿Estas seguro de activar a ${user.name} ${user.lastName}?`
              }
              onConfirm={() => handleToggleActive(user)}
              variant={user.isActive ? "destructive" : "default"}
              trigger={
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  {user.isActive ? (
                    <>
                      <UserX className="mr-2 h-4 w-4" />
                      Desactivar
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activar
                    </>
                  )}
                </DropdownMenuItem>
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <UsersFilters />
        {canManage && (
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        data={users}
        emptyTitle="Sin usuarios"
        emptyDescription="No se encontraron usuarios con los filtros aplicados."
      />
      {canManage && (
        <>
          <UserFormDialog
            open={formDialogOpen}
            onOpenChange={handleFormDialogChange}
            defaultValues={
              editingUser
                ? {
                    id: editingUser.id,
                    email: editingUser.email,
                    name: editingUser.name,
                    lastName: editingUser.lastName,
                    phone: editingUser.phone,
                    role: editingUser.role,
                  }
                : undefined
            }
          />
          {passwordUser && (
            <ChangePasswordDialog
              open={passwordDialogOpen}
              onOpenChange={handlePasswordDialogChange}
              userId={passwordUser.id}
              userName={passwordUser.name}
            />
          )}
        </>
      )}
    </div>
  );
}

function CommissionInput({
  userId,
  defaultValue,
  onSave,
}: {
  userId: string;
  defaultValue: number | null;
  onSave: (userId: string, value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    const newVal = value === "" ? null : parseFloat(value);
    const oldVal = defaultValue;
    if (newVal === oldVal) return;
    setSaving(true);
    await onSave(userId, value);
    setSaving(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min="0"
        max="100"
        step="0.1"
        placeholder="—"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 w-20"
        disabled={saving}
      />
      <Percent className="h-3 w-3 text-muted-foreground" />
    </div>
  );
}
