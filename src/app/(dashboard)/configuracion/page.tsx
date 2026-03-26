import { requirePermission } from "@/lib/auth-guard";
import { checkPermissionDb } from "@/lib/rbac";
import type { Role } from "@/types/enums";
import { getUsers } from "@/server/actions/user.actions";
import { getSystemConfig } from "@/server/actions/system-config.actions";
import {
  getAllRolePermissions,
  seedDefaultPermissions,
} from "@/server/actions/role-permission.actions";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersSection } from "./_components/users-section";
import { SystemConfigSection } from "./_components/system-config-section";
import { PermissionsSection } from "./_components/permissions-section";
import { ImportSection } from "./_components/import-section";
import { getBusinessHours } from "@/server/actions/business-hours.actions";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/business-hours";
import { BusinessHoursSection } from "./_components/business-hours-section";
import { getBankAccounts } from "@/server/actions/bank-account.actions";
import { BankAccountsSection } from "./_components/bank-accounts-section";

interface Props {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    role?: string;
  }>;
}

export default async function ConfiguracionPage({ searchParams }: Props) {
  const session = await requirePermission("users:view");
  const params = await searchParams;

  const [canManageUsers, canManageConfig] = await Promise.all([
    checkPermissionDb(session.user.role as Role, "users:manage"),
    checkPermissionDb(session.user.role as Role, "config:manage"),
  ]);

  const [users, config, rolePermissionsRaw, businessHours, bankAccountsRaw] = await Promise.all([
    getUsers({
      search: params.search,
      role: params.role,
    }),
    canManageConfig ? getSystemConfig() : Promise.resolve({} as Record<string, string>),
    canManageConfig ? getAllRolePermissions() : Promise.resolve({} as Record<string, string[]>),
    canManageConfig ? getBusinessHours() : Promise.resolve(DEFAULT_BUSINESS_HOURS),
    canManageConfig ? getBankAccounts() : Promise.resolve([]),
  ]);

  // Auto-seed default permissions if the table is empty
  let rolePermissions = rolePermissionsRaw;
  if (canManageConfig && Object.keys(rolePermissions).length === 0) {
    await seedDefaultPermissions();
    rolePermissions = await getAllRolePermissions();
  }

  const activeTab = params.tab ?? "usuarios";

  // Serialize Decimal fields for client components
  const serializedUsers = users.map((user) => ({
    ...user,
    commissionRate: user.commissionRate !== null ? Number(user.commissionRate) : null,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Configuracion"
        description="Gestion de usuarios y configuracion del sistema"
        icon={Settings}
        accentColor="border-slate-600"
      />
      <Tabs defaultValue={activeTab}>
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          {canManageConfig && (
            <TabsTrigger value="sistema">Sistema</TabsTrigger>
          )}
          {canManageConfig && (
            <TabsTrigger value="permisos">Permisos</TabsTrigger>
          )}
          {canManageConfig && (
            <TabsTrigger value="importar">Importar</TabsTrigger>
          )}
          {canManageConfig && (
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
          )}
          {canManageConfig && (
            <TabsTrigger value="cuentas">Cuentas Bancarias</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="usuarios" className="mt-6">
          <UsersSection users={serializedUsers} canManage={canManageUsers} />
        </TabsContent>
        {canManageConfig && (
          <TabsContent value="sistema" className="mt-6">
            <SystemConfigSection config={config} />
          </TabsContent>
        )}
        {canManageConfig && (
          <TabsContent value="permisos" className="mt-6">
            <PermissionsSection
              rolePermissions={rolePermissions}
              canManage={canManageConfig}
            />
          </TabsContent>
        )}
        {canManageConfig && (
          <TabsContent value="importar" className="mt-6">
            <ImportSection />
          </TabsContent>
        )}
        {canManageConfig && (
          <TabsContent value="horarios" className="mt-6">
            <BusinessHoursSection config={businessHours} />
          </TabsContent>
        )}
        {canManageConfig && (
          <TabsContent value="cuentas" className="mt-6">
            <BankAccountsSection accounts={bankAccountsRaw} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
