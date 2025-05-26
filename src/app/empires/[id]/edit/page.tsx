import { EmpireForm } from "@/components/empires/empire-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getEmpire(id: string) {
  const empire = await prisma.empire.findUnique({
    where: { id },
    include: {
      vassals: {
        where: {
          isArchived: false, // Exclude archived nations from vassals
        },
      },
    },
  });

  if (!empire) {
    throw new Error('Empire not found');
  }

  return empire;
}

async function getAvailableNations(empireId: string) {
  const nations = await prisma.nation.findMany({
    where: {
      isArchived: false, // Exclude archived nations
      OR: [
        { empireId: null }, // Nations that don't belong to any empire
        { empireId: empireId }, // Nations that belong to this empire
      ],
    },
    orderBy: [
      { region: 'asc' },
      { name: 'asc' },
    ],
  });
  
  return nations;
}

export default async function EditEmpirePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [empire, availableNations] = await Promise.all([
    getEmpire(id),
    getAvailableNations(id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/empires/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Empire</h1>
          <p className="text-muted-foreground">
            Update empire details and manage vassal nations
          </p>
        </div>
      </div>

      <EmpireForm 
        initialData={{
          id: empire.id,
          name: empire.name,
          vassals: empire.vassals,
        }}
        availableNations={availableNations}
      />
    </div>
  );
} 