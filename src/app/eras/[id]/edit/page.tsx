import { notFound } from "next/navigation";
import { getEra } from "@/app/api/_lib/queries";
import { EraForm } from "@/components/forms/EraForm";
export default async function EditEraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const era = await getEra((await params).id);
  if (!era) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Edit Era</h1>
      <EraForm initialData={era} />
    </div>
  );
}
