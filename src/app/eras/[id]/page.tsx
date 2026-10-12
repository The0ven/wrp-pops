import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEra } from "@/app/api/_lib/queries";
import { ArchiveEraButton } from "@/components/eras/archive-era-button";
export default async function EraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const era = await getEra(id);
  if (!era) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" asChild>
          <Link href="/eras">Back to Eras</Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/eras/${id}/edit`}>Edit Era</Link>
          </Button>
          <ArchiveEraButton era={era} />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{era.name}</CardTitle>
          <p className="text-muted-foreground">
            {era.startYear}–{era.endYear} · {era.growths.length} population
            records
          </p>
          {era.description && <p>{era.description}</p>}
        </CardHeader>
        <CardContent className="space-y-2">
          {era.growths.map((growth) => {
            const amount = era.additions
              .filter((a) => a.nationId === growth.nationId)
              .reduce((sum, a) => sum + a.amount, 0);
            return (
              <Link
                key={growth.id}
                href={`/eras/${id}/nations/${growth.nationId}`}
                className="block rounded-md border p-4 hover:bg-muted/50"
              >
                <p className="font-semibold">{growth.nation.name}</p>
                <p className="text-sm text-muted-foreground">
                  ({growth.startPopulation.toLocaleString()} +{" "}
                  {amount.toLocaleString()}) × (1 + {growth.growthRate})^
                  {era.endYear - era.startYear} ={" "}
                  {growth.endPopulation.toLocaleString()}
                </p>
              </Link>
            );
          })}
          {!era.growths.length && (
            <p className="text-muted-foreground">No population records yet.</p>
          )}
          <Button variant="outline" asChild>
            <Link href="/population">Add or edit population records</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
export const dynamic = "force-dynamic";
