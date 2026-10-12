import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart2, Clock, Globe } from "lucide-react";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { latestGrowthOrder } from "@/app/api/_lib/queries";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [nations, eras] = await Promise.all([
    prisma.nation.findMany({
      where: { isArchived: false },
      orderBy: { name: "asc" },
      include: { growths: { orderBy: latestGrowthOrder, take: 1 } },
    }),
    prisma.era.findMany({ orderBy: { endYear: "desc" } }),
  ]);
  const total = nations.reduce(
    (sum, n) => sum + (n.growths[0]?.endPopulation ?? n.startPopulation),
    0,
  );
  const rates = nations.flatMap((n) => n.growths.map((g) => g.growthRate));
  const average = rates.length
    ? rates.reduce((sum, r) => sum + r, 0) / rates.length
    : 0;
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Population Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze population statistics across different eras
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/nations/new">New Nation</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/eras/new">New Era</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nations</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {nations.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active nations in the system
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Population
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined population across all nations
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Eras</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {eras.length.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Time periods being tracked
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Growth
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(average * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average population growth rate
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Recent Eras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {eras.length
                ? eras.slice(0, 5).map((era) => (
                    <Link
                      key={era.id}
                      href={`/eras/${era.id}`}
                      className="block py-2 hover:underline"
                    >
                      {era.name} · {era.startYear}–{era.endYear}
                    </Link>
                  ))
                : "No eras yet. Create your first era to start tracking populations."}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Active Nations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {nations.length
                ? nations.slice(0, 5).map((nation) => (
                    <Link
                      key={nation.id}
                      href={`/nations/${nation.id}`}
                      className="block py-2 hover:underline"
                    >
                      {nation.name} ·{" "}
                      {(
                        nation.growths[0]?.endPopulation ??
                        nation.startPopulation
                      ).toLocaleString()}
                    </Link>
                  ))
                : "No nations yet. Create your first nation to start tracking populations."}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
