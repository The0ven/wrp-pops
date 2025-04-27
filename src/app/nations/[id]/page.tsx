import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getNation(id: string) {
  const nation = await prisma.nation.findUnique({
    where: { id },
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
  });

  if (!nation) {
    throw new Error('Nation not found');
  }

  return nation;
}

export default async function NationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const nation = await getNation(id);
  const latestGrowth = nation.growths[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/nations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{nation.name}</h1>
            <p className="text-muted-foreground">{nation.region}</p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/nations/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Nation
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Population</span>
                <span className="font-medium">
                  {latestGrowth?.endPopulation.toLocaleString() || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Growth Rate</span>
                <span className="font-medium">
                  {latestGrowth ? `${(latestGrowth.growthRate * 100).toFixed(2)}%` : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={nation.isArchived ? "text-muted-foreground" : "text-green-600"}>
                  {nation.isArchived ? "Archived" : "Active"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {nation.description || 'No description available'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Population History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nation.growths.map((growth) => (
              <div key={growth.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{growth.era.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(growth.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {growth.endPopulation.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {growth.growthRate > 0 ? '+' : ''}{(growth.growthRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 