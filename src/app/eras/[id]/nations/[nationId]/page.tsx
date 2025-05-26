import { GrowthAdditionForm } from "@/components/forms/GrowthAdditionForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { fetchGrowthAndAddition, fetchNation } from "@/actions/util";
import { ArrowLeft } from "lucide-react";
import { getEras } from "@/app/api/eras/route";
import { updateGrowth } from "@/app/api/growths/[id]/route";
import { updateAddition } from "@/app/api/additions/[id]/route";
import { submitGrowthAndAddition } from "@/actions/forms";


export default async function EditGrowthAdditionPage({ params }: { params: { id: string; nationId: string } }) {
  const { id: eraId, nationId } = await params;

  let initialData = null;
  let nation = null;
  let eras = null;
  let error = null;

  try {
    const { growth, addition } = await fetchGrowthAndAddition(eraId, nationId);
    if (!growth || !addition) throw new Error("No data found for this nation/era pair");
    initialData = { growth, addition };
    nation = await fetchNation(nationId);
    eras = await getEras();
  } catch (err: any) {
    error = err.message || "Unknown error";
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500 text-lg">{error}</div>
    );
  }
  if (!initialData) {
    return (
      <div className="flex items-center justify-center min-h-screen">No data found.</div>
    );
  }

  return (
    <div className="space-y-6 mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/eras/${eraId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {nation && initialData?.growth?.era
              ? `${nation.name} ${initialData.growth.era.startYear}-${initialData.growth.era.endYear}`
              : ""}
          </h1>
          <p className="text-muted-foreground">Edit growth and addition for this nation in this era</p>
        </div>
      </div>
      <GrowthAdditionForm
        initialData={initialData}
        nation={nation}
        era={initialData?.growth?.era}
        eras={eras}
        submitAction={submitGrowthAndAddition}
      />
    </div>
  );
} 