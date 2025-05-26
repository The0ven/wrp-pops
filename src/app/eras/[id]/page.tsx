import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getEra } from "@/app/api/eras/[id]/route";
import { Era, Growth } from "@prisma/client";
import { getNation } from "@/app/api/nations/[id]/route";

function EraSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-8 w-40" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-80" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

const GrowthCard = async ({growth, era}: {growth: Growth, era: Era}) => {
    const nation = await getNation(growth.nationId);
    if (!nation) return null;
    const addition = await prisma?.addition.findFirst({
        where: {
            eraId: era.id,
            nationId: nation.id,
        },
    });
    if (!addition) return null;
    return (
        <Link href={`/eras/${era.id}/nations/${nation.id}`} className="block group focus:outline-none">
          <Card key={growth.id} className="transition-shadow group-hover:shadow-lg cursor-pointer">
            <CardHeader>
                <CardTitle className="text-lg font-bold">{nation.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-1">
                <p>{growth.startPopulation.toLocaleString()}</p>
                <p>+</p>
                <p className={addition.amount > 0 ? "text-green-500" : "text-red-500"}>
                    {addition.amount.toLocaleString()}
                </p>
                <p>x</p>
                <p>{"(1"}</p>
                <p>+</p>
                <p className={growth.growthRate > 0 ? "text-green-500" : "text-red-500"}>
                    {growth.growthRate}<span className="text-foreground">)</span>
                </p>
                <sup>{era.endYear-era.startYear}</sup>
                <p>=</p>
                <p>{growth.endPopulation.toLocaleString()}</p>
            </CardContent>
          </Card>
        </Link>
    )
  }

export default async function EraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const era = await getEra(id, {
    growths: true,
    additions: true,
  });
  if (!era) return notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" asChild>
          <Link href="/eras">Back to Eras</Link>
        </Button>
      </div>
      <Card>
        <CardHeader className="flex justify-between">
          <CardTitle className="text-2xl font-bold">{era.name}</CardTitle>
          <div className="flex gap-6">
            <div>
              <span className="font-semibold">Additions:</span> {era.additions?.length || 0}
            </div>
            <div>
              <span className="font-semibold">Growths:</span> {era.growths?.length || 0}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {era.growths?.map((growth) => (
            <GrowthCard key={growth.id} growth={growth as Growth} era={era} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic"; 