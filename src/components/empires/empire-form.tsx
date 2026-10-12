"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Nation } from "@prisma/client";
import { z } from "zod";
import { empireSchema } from "@/lib/validation";
import { handleSubmitEmpireAction } from "@/actions/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FancyMultiSelect } from "@/components/ui/multiselect";

export function EmpireForm({
  initialData,
  availableNations,
}: {
  initialData?: { id: string; name: string; vassals?: Nation[] };
  availableNations: Nation[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof empireSchema>>({
    resolver: zodResolver(empireSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      vassalIds: initialData?.vassals?.map((v) => v.id) ?? [],
    },
  });
  const nations = [
    ...new Map(
      [...availableNations, ...(initialData?.vassals ?? [])].map((n) => [
        n.id,
        n,
      ]),
    ).values(),
  ];
  const ids = watch("vassalIds") ?? [];
  const selected = nations.filter((n) => ids.includes(n.id));
  async function save(data: z.infer<typeof empireSchema>) {
    setError(null);
    try {
      const result = await handleSubmitEmpireAction(initialData?.id, data);
      if (!result.success) {
        setError(result.message);
        return;
      }
      router.push(`/empires/${result.empire.id}`);
      router.refresh();
    } catch {
      setError(
        "Unable to save. Your selections are still here; please try again.",
      );
    }
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Empire" : "Create New Empire"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empire-name">Empire Name</Label>
              <Input id="empire-name" {...register("name")} required />
              {errors.name && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="vassals">Vassal Nations</Label>
              <FancyMultiSelect
                selected={selected}
                nations={nations}
                placeholder="Select vassal nations..."
                setSelected={(values) =>
                  setValue(
                    "vassalIds",
                    values.map((n) => n.id),
                    { shouldDirty: true },
                  )
                }
              />
              <p className="text-sm text-muted-foreground">
                {selected.length} selected. Archived members remain selected
                until you remove them.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {isSubmitting
                  ? "Saving..."
                  : initialData
                    ? "Update Empire"
                    : "Create Empire"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  router.push(
                    initialData ? `/empires/${initialData.id}` : "/empires",
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
