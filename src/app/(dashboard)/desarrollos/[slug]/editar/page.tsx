import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { getDevelopmentBySlug } from "@/server/actions/development.actions";
import { PageHeader } from "@/components/shared/page-header";
import { DevelopmentForm } from "../../_components/development-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function EditDevelopmentPage({ params }: Props) {
  await requirePermission("developments:manage");
  const { slug } = await params;
  const development = await getDevelopmentBySlug(slug);

  if (!development) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Editar Desarrollo" description={development.name} />
      <DevelopmentForm
        defaultValues={{
          id: development.id,
          slug: development.slug,
          name: development.name,
          description: development.description ?? "",
          location: development.location ?? "",
          googleMapsUrl: development.googleMapsUrl ?? "",
          type: development.type,
          status: development.status,
        }}
      />
    </div>
  );
}
