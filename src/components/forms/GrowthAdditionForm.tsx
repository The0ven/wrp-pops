"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Era, Nation } from "@prisma/client";

const PrevEraButton = ({eras, nation, era, setValue}: {eras: any[], nation: Nation, era: Era, setValue: any}) => {
  // Find all eras for this nation, sorted by startYear
  const nationEras = eras
    .filter((e: any) => e.growths && e.growths.some((g: any) => g.nation.id === nation.id))
    .sort((a: any, b: any) => a.startYear - b.startYear);
  // Find the index of the current era
  const currentEraIndex = nationEras.findIndex((e: any) => e.id === era.id);
  // Previous era is at currentEraIndex - 1
  if (currentEraIndex > 0) {
    const prevEra = nationEras[currentEraIndex - 1];
    const prevGrowth = prevEra.growths.find((g: any) => g.nation.id === nation.id);
    if (prevGrowth) {
      return (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-fit h-auto"
          onClick={() => setValue("startPopulation", prevGrowth.endPopulation)}
        >
          Use {prevEra.endYear} Pop
        </Button>
      );
    }
  }
  return null;
}


export function GrowthAdditionForm({
  initialData,
  nation,
  era,
  submitAction,
  loading = false,
  error = null,
  success = false,
  eras = [],
}: {
  initialData: any;
  nation: any;
  era: any;
  submitAction: (growthId: string, additionId: string, data: any) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
  eras?: any[];
}) {
  const { register, handleSubmit, formState: { isSubmitting, errors }, setValue } = useForm({
    defaultValues: {
      startPopulation: initialData?.growth?.startPopulation,
      growthRate: initialData?.growth?.growthRate,
      endPopulation: initialData?.growth?.endPopulation,
      amount: initialData?.addition?.amount,
      note: initialData?.addition?.notes,
    },
  });

  return (
    <Card>
      <CardHeader />
      <CardContent>
        <form onSubmit={handleSubmit((data) => submitAction(initialData.growth.id, initialData.addition.id, data))} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startPopulation">Start Population</Label>
              <div className="flex gap-2 items-stretch">
                <Input id="startPopulation" type="number" step="1" {...register("startPopulation", { required: true, valueAsNumber: true })} />
                <PrevEraButton eras={eras} nation={nation} era={era} setValue={setValue} />
              </div>
              {errors.startPopulation && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="growthRate">Growth Rate</Label>
              <Input id="growthRate" type="number" step="0.0001" {...register("growthRate", { required: true, valueAsNumber: true })} />
              {errors.growthRate && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endPopulation">End Population</Label>
              <Input id="endPopulation" type="number" step="1" {...register("endPopulation", { required: true, valueAsNumber: true })} />
              {errors.endPopulation && <span className="text-red-500 text-xs">Required</span>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="amount">Addition Amount</Label>
              <Input id="amount" type="number" step="1" {...register("amount", { required: true, valueAsNumber: true })} />
              {errors.amount && <span className="text-red-500 text-xs">Required</span>}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Addition Note</Label>
            <Textarea id="note" {...register("note")} />
          </div>
          <div className="flex gap-4 justify-end">
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting || loading ? "Saving..." : "Save"}
            </Button>
          </div>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          {success && <div className="text-green-600 text-sm mt-2">Saved!</div>}
        </form>
      </CardContent>
    </Card>
  );
} 