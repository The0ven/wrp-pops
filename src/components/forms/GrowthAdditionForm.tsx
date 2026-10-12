"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Nation } from "@prisma/client";
import { recordSchema, type RecordInput } from "@/lib/validation";
import {
  calculatePopulation,
  startingPopulation,
  type EraRecords,
} from "@/lib/population";
import { submitPopulationRecords } from "@/actions/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function GrowthAdditionForm({
  nation,
  era,
  eras,
}: {
  nation: Nation;
  era: EraRecords;
  eras: EraRecords[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const growth = era.growths.find((g) => g.nationId === nation.id);
  const additions = era.additions.filter((a) => a.nationId === nation.id);
  const previous = [...eras]
    .filter((e) => e.id !== era.id && e.endYear <= era.startYear)
    .sort((a, b) => b.endYear - a.endYear)
    .flatMap((e) =>
      e.growths
        .filter((g) => g.nationId === nation.id)
        .map((g) => ({ endYear: e.endYear, population: g.endPopulation })),
    )[0];
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<RecordInput>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      nationId: nation.id,
      eraId: era.id,
      startPopulation: startingPopulation(nation, era, eras),
      growthRate: growth?.growthRate ?? 0,
      amount: additions.reduce((sum, a) => sum + a.amount, 0),
      notes: additions.at(-1)?.notes ?? "",
    },
  });
  const values = watch();
  let preview = "Invalid values";
  try {
    preview = calculatePopulation(
      values.startPopulation ?? 0,
      values.amount,
      values.growthRate,
      era.endYear - era.startYear,
    ).toLocaleString();
  } catch {
    /* Validation below explains invalid inputs. */
  }
  async function save(data: RecordInput) {
    setError(null);
    setSuccess(false);
    try {
      const result = await submitPopulationRecords([data]);
      if (!result.success) {
        setError(result.message);
        return;
      }
      reset(data);
      setSuccess(true);
      await queryClient.invalidateQueries({ queryKey: ["nations"] });
      router.refresh();
    } catch {
      setError("Unable to save. Your edits are still here; please try again.");
    }
  }
  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(save)} className="space-y-4">
          <fieldset disabled={isSubmitting} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {(
                [
                  ["startPopulation", "Start Population"],
                  ["amount", "Addition Amount"],
                  ["growthRate", "Growth Rate (0.01 = 1%)"],
                ] as const
              ).map(([key, label]) => (
                <div className="space-y-2" key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    step={key === "growthRate" ? "0.001" : "1"}
                    min={
                      key === "growthRate"
                        ? -1
                        : key === "startPopulation"
                          ? 0
                          : undefined
                    }
                    {...register(key, { valueAsNumber: true, required: true })}
                    required
                  />
                  {errors[key] && (
                    <p role="alert" className="text-sm text-destructive">
                      {errors[key]?.message}
                    </p>
                  )}
                  {key === "startPopulation" && previous && (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        setValue("startPopulation", previous.population, {
                          shouldDirty: true,
                        })
                      }
                    >
                      Use {previous.endYear} Pop
                    </Button>
                  )}
                </div>
              ))}
              <div className="space-y-2">
                <Label>Calculated End Population</Label>
                <output
                  aria-label="Calculated End Population"
                  className="block rounded-md border p-2 tabular-nums"
                >
                  {preview}
                </output>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              End population = (start population + additions) × (1 + annual
              growth rate) raised to {era.endYear - era.startYear} years. Later
              records keep their saved starting populations.
            </p>
            {additions.length > 1 && (
              <p className="text-sm text-muted-foreground">
                The addition amount is the total of {additions.length} entries.
                Saving adjusts the last entry and preserves the others.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Addition Note</Label>
              <Textarea id="notes" {...register("notes")} />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/eras/${era.id}`)}
              >
                Back to era
              </Button>
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-green-600">
              Saved!
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
