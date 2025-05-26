'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FancyMultiSelect } from "@/components/ui/multiselect";
import { handleSubmitEmpireAction } from "@/actions/forms";
import { Nation } from "@prisma/client";
import { z } from "zod";

interface EmpireFormProps {
  initialData?: {
    id: string;
    name: string;
    vassals?: Nation[];
  };
  availableNations: Nation[];
}

// Empire form validation schema
export const empireFormSchema = z.object({
  name: z.string().min(1, "Empire name is required").max(100, "Empire name must be less than 100 characters"),
  vassalIds: z.array(z.string()).optional(),
});

export type EmpireFormData = z.infer<typeof empireFormSchema>;

export function EmpireForm({ initialData, availableNations }: EmpireFormProps) {
  const router = useRouter();

  const [selectedVassals, setSelectedVassals] = useState<Nation[]>([]);


  const form = useForm<EmpireFormData>({
    resolver: zodResolver(empireFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      vassalIds: initialData?.vassals?.map(v => v.id) || [],
    },
  });


  const onSubmit = async (data: EmpireFormData) => {

    try {
      // First save the empire
      const empireData = { name: data.name };
      const result = await handleSubmitEmpireAction(initialData?.id, empireData);
      
      if (result.success && result.empire) {
        // Then update the nations' empireId
        const empireId = result.empire.id;
        
        // Update selected vassals to belong to this empire
        for (const vassal of selectedVassals) {
          await fetch(`/api/nations/${vassal.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empireId }),
          });
        }
        
        // Remove empire assignment from nations that were deselected
        if (initialData?.vassals) {
          const deselectedVassals = initialData.vassals.filter(
            initial => !selectedVassals.some(selected => selected.id === initial.id)
          );
          
          for (const vassal of deselectedVassals) {
            await fetch(`/api/nations/${vassal.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ empireId: null }),
            });
          }
        }
        
        router.push(`/empires/${result.empire.id}`);
      } else {
        console.error(result.message || 'Failed to save empire');
      }
    } catch (error) {
        console.error('Error saving empire:', error);
    } finally {
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? "Edit Empire" : "Create New Empire"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empire Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter empire name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="vassalIds"
              render={() => (
                <FormItem>
                  <FormLabel>Vassal Nations</FormLabel>
                  <FormControl>
                    <FancyMultiSelect
                      selected={selectedVassals}
                      nations={availableNations.filter(nation => 
                        !selectedVassals.some(selected => selected.id === nation.id)
                      )}
                      placeholder="Select vassal nations..."
                      setSelected={(vassals: Nation[]) => {
                        setSelectedVassals(vassals);
                        form.setValue('vassalIds', vassals.map(v => v.id));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting 
                ? (initialData ? "Updating..." : "Creating...") 
                : (initialData ? "Update Empire" : "Create Empire")
              }
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 