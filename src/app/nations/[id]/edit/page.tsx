"use client";

import { NationForm } from "@/components/forms/NationForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Nation } from "@prisma/client";
import { useEffect, useState } from "react";
import React from "react";
import { handleSubmit } from "@/actions/forms";

export default function EditNationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [nation, setNation] = useState<Nation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNation = async () => {
      try {
        const response = await fetch(`/api/nations/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch nation');
        }
        const data = await response.json();
        setNation(data);
      } catch (error) {
        console.error('Error fetching nation:', error);
        // TODO: Show error message to user
      } finally {
        setLoading(false);
      }
    };

    fetchNation();
  }, [id]);


  if (loading) {
    return <div>Loading...</div>;
  }

  if (!nation) {
    return <div>Nation not found</div>;
  }
  console.log(JSON.stringify(nation))

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

      <NationForm initialData={nation} onSubmitAction={handleSubmit} action="PUT" />
    </div>
  );
} 
