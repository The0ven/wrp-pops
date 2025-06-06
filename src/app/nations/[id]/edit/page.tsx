import { NationForm } from "@/components/forms/NationForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { getNation } from "@/app/api/nations/[id]/route";

export default async function EditNationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const nation = await getNation(id, {
    growths: {
      include: {
        era: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
  }); 

  if (!nation) {
    return <div>Nation not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href={`/nations/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Nation</h1>
          <p className="text-muted-foreground">
            Update the nation's information
          </p>
        </div>
      </div>

      <NationForm initialData={nation}/>
    </div>
  );
} 
