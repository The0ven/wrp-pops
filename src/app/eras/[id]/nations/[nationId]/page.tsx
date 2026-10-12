import { notFound } from "next/navigation";
import Link from "next/link";
import { GrowthAdditionForm } from "@/components/forms/GrowthAdditionForm";
import { getEras, getNation } from "@/app/api/_lib/queries";
export default async function EditGrowthAdditionPage({
  params,
}: {
  params: Promise<{ id: string; nationId: string }>;
}) {
  const { id, nationId } = await params;
  const [eras, nation] = await Promise.all([getEras(), getNation(nationId)]);
  const era = eras.find((e) => e.id === id);
  if (!era || !nation) notFound();
  return (
    <div className="space-y-6">
      <Link href={`/eras/${id}`} className="text-sm underline">
        Back to era
      </Link>
      <div>
        <h1 className="text-3xl font-bold">
          {nation.name}: {era.startYear}–{era.endYear}
        </h1>
        <p className="text-muted-foreground">
          Edit population, growth, and additions
        </p>
      </div>
      <GrowthAdditionForm nation={nation} era={era} eras={eras} />
    </div>
  );
}
