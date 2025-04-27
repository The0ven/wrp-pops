"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Nation } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { FancyMultiSelect } from "@/components/ui/multiselect";
import { Form } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

interface NationFormProps {
  initialData?: Nation;
  onSubmit: (data: Omit<Nation, "id" | "createdAt" | "updatedAt">) => void;
}

const nationFormSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(2).max(50),
  region: z.string().min(2).max(50),
  isArchived: z.boolean(),
  startYear: z.number(),
  startPopulation: z.number(),
  vassalIds: z.array(z.string()),
  overlordId: z.string().optional(),
})

export function NationForm({ initialData, onSubmit }: NationFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [region, setRegion] = useState(initialData?.region || "");
  const [isArchived, setIsArchived] = useState(initialData?.isArchived || false);
  const [startYear, setStartYear] = useState(initialData?.startYear || 1000);
  const [startPopulation, setStartPopulation] = useState(initialData?.startPopulation || 0);
  const [availableNations, setAvailableNations] = useState<Set<Nation>>(new Set());
  const [selectedVassals, setSelectedVassals] = useState<Set<Nation>>(
    initialData?.vassalIds ? new Set(JSON.parse(initialData.vassalIds)) : new Set()
  );

  const form = useForm<z.infer<typeof nationFormSchema>>({
    resolver: zodResolver(nationFormSchema),
    defaultValues: {
      name: "",
      description: "",
      region: "",
      isArchived: false,
      startYear: 1000,
      startPopulation: 0,
      vassalIds: [],
    },
  })

  const setVassals = (vassals: Nation[]) => {
    setSelectedVassals(new Set(vassals));
  }

  useEffect(() => {
    const fetchNations = async () => {
      try {
        const response = await fetch('/api/nations');
        if (!response.ok) throw new Error('Failed to fetch nations');
        const nations = await response.json();
        // Filter out the current nation and its vassals and any nations that would create circular dependencies
        const filteredNations = nations.filter((n: Nation) => 
          n.id !== initialData?.id && // Not the current nation
          !JSON.parse(n.vassalIds || '[]').includes(initialData?.id) && // Not already a vassal
          n.overlordId !== initialData?.id && // Not already has this nation as overlord
          !hasCircularDependency(n, initialData?.id) // Would not create circular dependency
        );
        setAvailableNations(filteredNations);
      } catch (error) {
        console.error('Error fetching nations:', error);
      }
    };

    fetchNations();
  }, [initialData?.id]);

  // Helper function to check for circular dependencies
  const hasCircularDependency = (nation: Nation, targetId: string | undefined): boolean => {
    if (!targetId) return false;
    if (nation.id === targetId) return true;
    const vassalIds = JSON.parse(nation.vassalIds || '[]');
    return vassalIds.some((id: string) => hasCircularDependency(Array.from(availableNations).find(n => n.id === id)!, targetId));
  };

  const doSubmit = (data: z.infer<typeof nationFormSchema>) => {
    console.log("AJHJ", selectedVassals);
    onSubmit({
      name: data.name,
      description: data.description,
      region: data.region,
      isArchived: data.isArchived,
      startYear: data.startYear,
      startPopulation: data.startPopulation,
      vassalIds: JSON.stringify(Array.from(selectedVassals).map(vassal => vassal.id)),
      overlordId: data.overlordId || null,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Nation" : "Create New Nation"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(doSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nation Name</Label>
              <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter nation name"
              required
            />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="Enter region"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter nation description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startYear">Start Year</Label>
              <Input
                id="startYear"
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(parseInt(e.target.value))}
                placeholder="Enter start year"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startPopulation">Start Population</Label>
              <Input
                id="startPopulation"
                type="number"
                value={startPopulation}
                onChange={(e) => setStartPopulation(parseInt(e.target.value))}
                placeholder="Enter start population"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Vassals</Label>
              <FancyMultiSelect
                selected={Array.from(selectedVassals)}
                nations={Array.from(availableNations.difference(selectedVassals))}
                placeholder="Select vassals..."
                setSelected={setVassals}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isArchived"
                checked={isArchived}
                onCheckedChange={setIsArchived}
              />
              <Label htmlFor="isArchived">Archive Nation</Label>
            </div>
            <Button type="submit">
              {initialData ? "Update Nation" : "Create Nation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 