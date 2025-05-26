import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Crown } from "lucide-react";
import { EmpiresListWithSearch } from "@/components/empires/empires-list-with-search";
import { prisma } from "@/lib/prisma";

async function getEmpires() {
  const empires = await prisma.empire.findMany({
    orderBy: [
      { name: 'asc' },
    ],
    include: {
      vassals: {
        where: {
          isArchived: false, // Exclude archived nations from vassals
        },
        include: {
          growths: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1, // Only get the latest growth for each nation
          },
        },
        orderBy: {
          name: 'asc',
        },
      },
    },
  });
  return empires;
}

export default async function EmpiresPage() {
  const empires = await getEmpires();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Empires</h1>
          <p className="text-muted-foreground">
            Manage and track empires and their vassal nations
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/empires/new">
              <Crown className="mr-2 h-4 w-4" />
              New Empire
            </Link>
          </Button>
        </div>
      </div>

      <EmpiresListWithSearch empires={empires} />
    </div>
  );
} 