import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { getPersonById } from "@/server/actions/person.actions";
import { PageHeader } from "@/components/shared/page-header";
import { PersonForm } from "../../_components/person-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditPersonPage({ params }: Props) {
  await requirePermission("persons:manage");
  const { id } = await params;
  const person = await getPersonById(id);

  if (!person) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Editar Persona"
        description={`${person.firstName} ${person.lastName}`}
      />
      <PersonForm
        defaultValues={{
          id: person.id,
          type: person.type,
          firstName: person.firstName,
          lastName: person.lastName,
          dni: person.dni ?? "",
          cuit: person.cuit ?? "",
          email: person.email ?? "",
          phone: person.phone ?? "",
          phone2: person.phone2 ?? "",
          address: person.address ?? "",
          city: person.city ?? "",
          province: person.province ?? "",
          notes: person.notes ?? "",
        }}
      />
    </div>
  );
}
