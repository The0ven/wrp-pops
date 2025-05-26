import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Pencil, Crown } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getEmpire(id: string) {
  const empire = await prisma.empire.findUnique({
    where: { id },
    include: {
      vassals: {
        where: {
          isArchived: false, // Exclude archived nations from vassals
        },
        include: {
          growths: {
            include: {
              era: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      },
    },
  });

  if (!empire) {
    throw new Error('Empire not found');
  }

  return empire;
}

export default async function EmpirePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const empire = await getEmpire(id);

  // Calculate total population across all vassals
  const totalPopulation = empire.vassals.reduce((total, vassal) => {
    const latestGrowth = vassal.growths[0];
    return total + (latestGrowth?.endPopulation || vassal.startPopulation);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/empires">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8" />
              {empire.name}
            </h1>
            <p className="text-muted-foreground">
              {empire.vassals.length} vassal{empire.vassals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/empires/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Empire
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Empire Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Population</span>
                <span className="font-medium">
                  {totalPopulation.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vassal Nations</span>
                <span className="font-medium">
                  {empire.vassals.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Founded</span>
                <span className="font-medium">
                  {new Date(empire.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empire Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from(new Set(empire.vassals.map(v => v.region))).map(region => {
                const regionNations = empire.vassals.filter(v => v.region === region);
                const regionPop = regionNations.reduce((total, vassal) => {
                  const latestGrowth = vassal.growths[0];
                  return total + (latestGrowth?.endPopulation || vassal.startPopulation);
                }, 0);
                
                return (
                  <div key={region} className="flex justify-between">
                    <span className="text-muted-foreground">{region}</span>
                    <span className="font-medium">
                      {regionPop.toLocaleString()} ({regionNations.length})
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vassal Nations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {empire.vassals.length === 0 ? (
              <p className="text-muted-foreground">No vassal nations yet.</p>
            ) : (
              empire.vassals.map((vassal) => {
                const latestGrowth = vassal.growths[0];
                const currentPop = latestGrowth?.endPopulation || vassal.startPopulation;
                
                return (
                  <Link key={vassal.id} href={`/nations/${vassal.id}`} className="block">
                    <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 rounded px-2 transition-colors cursor-pointer">
                      <div>
                        <p className="font-medium">{vassal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {vassal.region} • Founded {vassal.startYear}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {currentPop.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {latestGrowth ? 
                            `${latestGrowth.growthRate > 0 ? '+' : ''}${(latestGrowth.growthRate * 100).toFixed(2)}%` 
                            : 'No growth data'
                          }
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 