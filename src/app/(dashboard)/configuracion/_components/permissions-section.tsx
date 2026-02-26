"use client";

import { Fragment, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { updateRolePermissions } from "@/server/actions/role-permission.actions";
import type { Role } from "@/types/enums";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Users,
  ShoppingCart,
  Wallet,
  FileSignature,
  UserCog,
  Settings,
  Shield,
  Loader2,
  Eye,
  Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Props {
  rolePermissions: Record<string, string[]>;
  canManage: boolean;
}

const EDITABLE_ROLES: Role[] = ["ADMINISTRACION", "FINANZAS", "COBRANZA"];

const PERMISSION_LABELS: Record<string, { label: string; type: "view" | "manage" }> = {
  "dashboard:view": { label: "Ver Dashboard", type: "view" },
  "developments:view": { label: "Ver Desarrollos", type: "view" },
  "developments:manage": { label: "Gestionar Desarrollos", type: "manage" },
  "lots:view": { label: "Ver Lotes", type: "view" },
  "lots:manage": { label: "Gestionar Lotes", type: "manage" },
  "persons:view": { label: "Ver Personas", type: "view" },
  "persons:manage": { label: "Gestionar Personas", type: "manage" },
  "sales:view": { label: "Ver Ventas", type: "view" },
  "sales:manage": { label: "Gestionar Ventas", type: "manage" },
  "cash:view": { label: "Ver Caja", type: "view" },
  "cash:manage": { label: "Gestionar Caja", type: "manage" },
  "signings:view": { label: "Ver Firmas", type: "view" },
  "signings:manage": { label: "Gestionar Firmas", type: "manage" },
  "users:view": { label: "Ver Usuarios", type: "view" },
  "users:manage": { label: "Gestionar Usuarios", type: "manage" },
  "config:manage": { label: "Gestionar Configuracion", type: "manage" },
};

const PERMISSION_GROUPS: { label: string; icon: LucideIcon; permissions: string[] }[] = [
  { label: "Dashboard", icon: LayoutDashboard, permissions: ["dashboard:view"] },
  { label: "Desarrollos", icon: Building2, permissions: ["developments:view", "developments:manage"] },
  { label: "Lotes", icon: MapPin, permissions: ["lots:view", "lots:manage"] },
  { label: "Personas", icon: Users, permissions: ["persons:view", "persons:manage"] },
  { label: "Ventas", icon: ShoppingCart, permissions: ["sales:view", "sales:manage"] },
  { label: "Caja", icon: Wallet, permissions: ["cash:view", "cash:manage"] },
  { label: "Firmas", icon: FileSignature, permissions: ["signings:view", "signings:manage"] },
  { label: "Usuarios", icon: UserCog, permissions: ["users:view", "users:manage"] },
  { label: "Configuracion", icon: Settings, permissions: ["config:manage"] },
];

export function PermissionsSection({ rolePermissions, canManage }: Props) {
  const [permissions, setPermissions] = useState<Record<string, string[]>>(rolePermissions);
  const [isPending, startTransition] = useTransition();
  const [savingRole, setSavingRole] = useState<string | null>(null);

  function hasPermission(role: string, permission: string): boolean {
    return permissions[role]?.includes(permission) ?? false;
  }

  function handleTogglePermission(role: string, permission: string) {
    const current = permissions[role] ?? [];
    const updated = current.includes(permission)
      ? current.filter((p) => p !== permission)
      : [...current, permission];

    setPermissions((prev) => ({ ...prev, [role]: updated }));
    setSavingRole(role);

    startTransition(async () => {
      const result = await updateRolePermissions(role, updated);
      setSavingRole(null);

      if (result.success) {
        toast.success(`Permisos de ${ROLE_LABELS[role as Role]} actualizados`);
      } else {
        setPermissions((prev) => ({ ...prev, [role]: current }));
        toast.error(result.error ?? "Error al actualizar permisos");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>Matriz de Permisos por Rol</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Super Admin tiene acceso completo. Configura los permisos de cada rol.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Permiso</TableHead>
              {EDITABLE_ROLES.map((role) => (
                <TableHead key={role} className="text-center w-[160px]">
                  <div className="flex flex-col items-center gap-1">
                    <span>{ROLE_LABELS[role]}</span>
                    {savingRole === role && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-normal normal-case tracking-normal">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Guardando
                      </span>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <Fragment key={group.label}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell
                      colSpan={EDITABLE_ROLES.length + 1}
                      className="py-2"
                    >
                      <div className="flex items-center gap-2 font-medium text-xs uppercase tracking-wider">
                        <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {group.label}
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.permissions.map((permission) => {
                    const meta = PERMISSION_LABELS[permission];
                    return (
                      <TableRow key={permission}>
                        <TableCell className="pl-9">
                          <div className="flex items-center gap-2">
                            {meta?.type === "view" ? (
                              <Eye className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5 text-amber-500" />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {meta?.label ?? permission}
                            </span>
                            <Badge
                              variant={meta?.type === "view" ? "secondary" : "outline"}
                              className="text-[10px] px-1.5 py-0"
                            >
                              {meta?.type === "view" ? "Lectura" : "Escritura"}
                            </Badge>
                          </div>
                        </TableCell>
                        {EDITABLE_ROLES.map((role) => (
                          <TableCell key={`${role}-${permission}`} className="text-center">
                            <div className="flex justify-center">
                              <Switch
                                size="sm"
                                checked={hasPermission(role, permission)}
                                onCheckedChange={() => handleTogglePermission(role, permission)}
                                disabled={!canManage || isPending}
                                aria-label={`${meta?.label ?? permission} para ${ROLE_LABELS[role]}`}
                              />
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
