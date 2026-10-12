"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Nation } from "@prisma/client";
import { nationSchema } from "@/lib/validation";
import { handleSubmitNationAction } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Values = z.infer<typeof nationSchema>;
export function NationForm({ initialData }: { initialData?: Nation }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(nationSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      region: initialData?.region ?? "",
      description: initialData?.description ?? "",
      startYear: initialData?.startYear ?? 1000,
      startPopulation: initialData?.startPopulation ?? 0,
      isArchived: initialData?.isArchived ?? false,
    },
  });
  async function save(data: Values) {
    setError(null);
    try {
      const result = await handleSubmitNationAction(initialData?.id, data);
      if (!result.success) {
        setError(result.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["nations"] });
      router.push(`/nations/${result.nation.id}`);
      router.refresh();
    } catch {
      setError("Unable to save. Your edits are still here; please try again.");
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Nation" : "Create New Nation"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            {(
              [
                ["name", "Nation Name"],
                ["region", "Region"],
                ["startYear", "Start Year"],
                ["startPopulation", "Start Population"],
              ] as const
            ).map(([key, label]) => {
              const numeric = key === "startYear" || key === "startPopulation";
              return (
                <div className="space-y-2" key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={numeric ? "number" : "text"}
                    step={numeric ? 1 : undefined}
                    min={key === "startPopulation" ? 0 : undefined}
                    {...register(key, { valueAsNumber: numeric })}
                    required
                  />
                  {errors[key] && (
                    <p role="alert" className="text-sm text-destructive">
                      {errors[key]?.message}
                    </p>
                  )}
                </div>
              );
            })}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
            {initialData && (
              <p className="text-sm text-muted-foreground">
                Founding details do not rewrite population history. Edit
                historical values in Population Records. Vassals are managed in
                the empire editor.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="isArchived"
                checked={watch("isArchived")}
                onCheckedChange={(value) =>
                  setValue("isArchived", value, { shouldDirty: true })
                }
              />
              <Label htmlFor="isArchived">Archive Nation</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {isSubmitting
                  ? "Saving..."
                  : initialData
                    ? "Update Nation"
                    : "Create Nation"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    initialData ? `/nations/${initialData.id}` : "/nations",
                  )
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
