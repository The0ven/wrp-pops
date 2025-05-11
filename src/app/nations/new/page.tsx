"use client";

import { NationForm } from "@/components/forms/NationForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { handleSubmit } from "@/actions/forms"

export default function NewNationPage() {
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

      <NationForm onSubmitAction={handleSubmit} action="POST" />
    </div>
  );
} 
