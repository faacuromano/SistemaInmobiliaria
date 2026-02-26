import { requirePermission } from "@/lib/auth-guard";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentForm } from "../_components/development-form";

export default async function NewDevelopmentPage() {
  await requirePermission("developments:manage");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Nuevo Desarrollo" description="Creá un nuevo desarrollo inmobiliario" />
      <DevelopmentForm />
    </div>
  );
}
