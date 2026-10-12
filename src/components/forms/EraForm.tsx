"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import type { Era } from "@prisma/client";
import { eraSchema } from "@/lib/validation";
import { handleSubmitEraAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function EraForm({ initialData }: { initialData?: Era }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof eraSchema>>({
    resolver: zodResolver(eraSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      startYear: initialData?.startYear ?? 0,
      endYear: initialData?.endYear ?? 0,
      description: initialData?.description ?? "",
    },
  });
  async function save(data: z.infer<typeof eraSchema>) {
    setError(null);
    try {
      const result = await handleSubmitEraAction(initialData?.id, data);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/eras/${result.era.id}`);
      router.refresh();
    } catch {
      setError("Unable to save. Your edits are still here; please try again.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Era" : "Create New Era"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            {(
              [
                ["name", "Era Name"],
                ["startYear", "Start Year"],
                ["endYear", "End Year"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type={key === "name" ? "text" : "number"}
                  step={key === "name" ? undefined : 1}
                  {...register(key, { valueAsNumber: key !== "name" })}
                  required
                />
                {errors[key] && (
                  <p role="alert" className="text-sm text-destructive">
                    {errors[key]?.message}
                  </p>
                )}
              </div>
            ))}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
            {initialData && (
              <p className="text-sm text-muted-foreground">
                Changing the years recalculates this era's populations. Existing
                addition dates must stay within the era.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit">
                {isSubmitting
                  ? "Saving..."
                  : initialData
                    ? "Update Era"
                    : "Create Era"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(initialData ? `/eras/${initialData.id}` : "/eras")
                }
              >
                Cancel
              </Button>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
