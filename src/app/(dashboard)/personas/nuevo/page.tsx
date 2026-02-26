import { requirePermission } from "@/lib/auth-guard";
import { PageHeader } from "@/components/shared/page-header";
import { PersonForm } from "../_components/person-form";

export default async function NewPersonPage() {
  await requirePermission("persons:manage");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Nueva Persona" description="Registrar nuevo cliente o proveedor" />
      <PersonForm />
    </div>
  );
}
