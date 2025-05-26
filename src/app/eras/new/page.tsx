"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EraForm } from "@/components/forms/EraForm";

export default function NewEraPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEraSubmit = async (data: { name: string; startYear: number; endYear: number; description?: string }) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/eras", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create era");
      }
      router.push("/eras");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">New Era</h1>
        <p className="text-muted-foreground">
          Create a new time period for tracking population statistics
        </p>
      </div>
      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}
      <EraForm
        onSubmit={handleEraSubmit}
      />
      <div className="flex justify-end mt-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
} 