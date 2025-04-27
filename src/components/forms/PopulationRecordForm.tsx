"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PopulationRecord, Nation, Era } from "@/types/population";

interface PopulationRecordFormProps {
  initialData?: PopulationRecord;
  nations: Nation[];
  eras: Era[];
  onSubmit: (data: Omit<PopulationRecord, "id" | "createdAt" | "updatedAt">) => void;
}

export function PopulationRecordForm({
  initialData,
  nations,
  eras,
  onSubmit,
}: PopulationRecordFormProps) {
  const [nationId, setNationId] = useState(initialData?.nationId || "");
  const [eraId, setEraId] = useState(initialData?.eraId || "");
  const [population, setPopulation] = useState(initialData?.population || 0);
  const [growthRate, setGrowthRate] = useState(initialData?.growthRate || 0);
  const [notes, setNotes] = useState(initialData?.notes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!nationId || !eraId) {
      return;
    }

    onSubmit({
      nationId,
      eraId,
      population,
      growthRate,
      notes,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Population Record" : "Create New Population Record"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nation">Nation</Label>
              <Select value={nationId} onValueChange={setNationId}>
                <SelectTrigger id="nation">
                  <SelectValue placeholder="Select a nation" />
                </SelectTrigger>
                <SelectContent>
                  {nations.map((nation) => (
                    <SelectItem key={nation.id} value={nation.id}>
                      {nation.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="era">Era</Label>
              <Select value={eraId} onValueChange={setEraId}>
                <SelectTrigger id="era">
                  <SelectValue placeholder="Select an era" />
                </SelectTrigger>
                <SelectContent>
                  {eras.map((era) => (
                    <SelectItem key={era.id} value={era.id}>
                      {era.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="population">Population</Label>
              <Input
                id="population"
                type="number"
                value={population}
                onChange={(e) => setPopulation(Number(e.target.value))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growthRate">Growth Rate (%)</Label>
              <Input
                id="growthRate"
                type="number"
                step="0.01"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes"
            />
          </div>
          <Button type="submit">
            {initialData ? "Update Record" : "Create Record"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 