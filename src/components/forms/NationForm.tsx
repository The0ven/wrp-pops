"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Nation } from "@prisma/client";
import { Switch } from "@/components/ui/switch";
import { FancyMultiSelect } from "@/components/ui/multiselect";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

interface NationFormProps {
  initialData?: Nation;
  onSubmitAction: (action: "POST" | "PUT", id: string | undefined, data: Omit<Nation, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  action: "POST" | "PUT";
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

type FormSchema = z.infer<typeof nationFormSchema>

const fetchNation = async (id: string): Promise<Nation> => {
    const response = await fetch(`/api/nations/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to fetch nation with id ${id}`);
    }
    return await response.json() as Nation;
}

export function NationForm({ initialData, onSubmitAction, action }: NationFormProps) {
  console.log(initialData?.vassalIds)
  const [isArchived, setIsArchived] = useState(initialData?.isArchived || false);
  const [availableNations, setAvailableNations] = useState<Set<Nation>>(new Set());
  const [selectedVassals, setSelectedVassals] = useState<Set<Nation>>(new Set());

  useEffect(() => {
    const ids: string[] = JSON.parse(initialData?.vassalIds || "[]")
    const fetchNations = async () => {
        try {
            const nations = await Promise.all(ids.map(id => fetchNation(id)))
            setSelectedVassals(new Set(nations))
        } catch (error) {
            console.error('Error fetching nations:', error);
        }
    }
    fetchNations();
  }, [initialData?.vassalIds])

  const router = useRouter()

  const form = useForm<FormSchema>({
    resolver: zodResolver(nationFormSchema),
    defaultValues: {
      name: initialData?.name,
      description: initialData?.description || undefined,
      region: initialData?.region,
      isArchived: initialData?.isArchived,
      startYear: initialData?.startYear,
      startPopulation: initialData?.startPopulation,
      vassalIds: Array.from(selectedVassals).map((v) => v.id),
    },
  })

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

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
        setAvailableNations(new Set(filteredNations));
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

  const onSubmitForm: SubmitHandler<FormSchema> = async (data: FormSchema) => {
    console.log("AJHJ", selectedVassals);
    await onSubmitAction(action, initialData?.id, {
      name: data.name,
      description: data.description,
      region: data.region,
      isArchived: isArchived,
      startYear: data.startYear,
      startPopulation: data.startPopulation,
      vassalIds: JSON.stringify(Array.from(selectedVassals).map(vassal => vassal.id)),
      overlordId: data.overlordId || null,
    });
    router.push(`/nations${initialData?.id ? ("/"+initialData?.id) : ""}`)
  };

  const FormInput = ({id, label, placeholder, params = {}}: {label: string, id: keyof FormSchema, placeholder: string, params?: any}) => {
     return(           
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <Input
              id={id}
              {...register(id)}
              placeholder={placeholder}
              {...params}
            />
        </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Nation" : "Create New Nation"}</CardTitle>
      </CardHeader>
      <CardContent>
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
            <FormInput 
                label="Nation Name"
                id="name"
                placeholder="Enter nation name"
                params={{required: true}}
            />
            <FormInput 
                label="Region"
                id="region"
                placeholder="Enter region"
                params={{required: true}}
            />
            <FormInput 
                label="Description"
                id="description"
                placeholder="Enter nation description"
            />
            <FormInput 
                label="Start Year"
                id="startYear"
                placeholder="Enter start year"
                params={{required: true, type: "number"}}
            />
            <FormInput 
                label="Start Population"
                id="startPopulation"
                placeholder="Enter start population"
                params={{required: true, type: "number"}}
            />
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
                {...register("isArchived")}
              />
              <Label htmlFor="isArchived">Archive Nation</Label>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {initialData ? "Update Nation" : "Create Nation"}
            </Button>
          </form>
      </CardContent>
    </Card>
  );
} 
