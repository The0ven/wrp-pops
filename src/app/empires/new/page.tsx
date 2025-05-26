import { EmpireForm } from "@/components/empires/empire-form";
import { prisma } from "@/lib/prisma";

async function getAvailableNations() {
  const nations = await prisma.nation.findMany({
    where: {
      empireId: null, // Only nations that don't belong to any empire
      isArchived: false, // Exclude archived nations
    },
    orderBy: [
      { region: 'asc' },
      { name: 'asc' },
    ],
  });
  
  return nations;
}

export default async function NewEmpirePage() {
  const availableNations = await getAvailableNations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create New Empire</h1>
        <p className="text-muted-foreground">
          Create a new empire to manage vassal nations
        </p>
      </div>

      <EmpireForm availableNations={availableNations} />
    </div>
  );
} 