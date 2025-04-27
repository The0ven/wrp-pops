"use client";

import { NationForm } from "@/components/forms/NationForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Nation } from "@/types/population";

export default function NewNationPage() {
  const router = useRouter();

  const handleSubmit = async (data: Omit<Nation, "id" | "createdAt" | "updatedAt">) => {
    try {
      const response = await fetch('/api/nations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create nation');
      }

      router.push('/nations');
    } catch (error) {
      console.error('Error creating nation:', error);
      // TODO: Show error message to user
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/nations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Nation</h1>
          <p className="text-muted-foreground">
            Create a new nation to track its population statistics
          </p>
        </div>
      </div>

      <NationForm onSubmit={handleSubmit} />
    </div>
  );
} 