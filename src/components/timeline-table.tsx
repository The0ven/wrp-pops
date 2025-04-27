"use client"

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export function TimelineTable({ eras }: { eras: any[] }) {
  const [showArchived, setShowArchived] = React.useState(false);
  
  // Sort eras by end year in ascending order
  const sortedEras = [...eras].sort((a, b) => a.endYear - b.endYear);
  
  // Get all unique nations across all eras and their start years
  const allNations = new Map<string, { name: string; startYear: number; startPop: number; isArchived: boolean; id: string }>();
  eras.forEach(era => {
    era.growths?.forEach((growth: any) => {
      if (!allNations.has(growth.nation.name)) {
        allNations.set(growth.nation.name, {
          name: growth.nation.name,
          startYear: growth.nation.startYear,
          startPop: growth.nation.startPopulation,
          isArchived: growth.nation.isArchived,
          id: growth.nation.id
        });
      }
    });
  });
  const nations = Array.from(allNations.values())
    .filter(nation => showArchived || !nation.isArchived)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (sortedEras.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No eras created yet. Create your first era to start tracking populations.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-end space-x-2 mb-4">
        <Label htmlFor="show-archived">Show Archived Nations</Label>
        <Switch
          id="show-archived"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
      </div>
      <div className="overflow-x-auto pb-4 px-4 scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nation</TableHead>
              {sortedEras.map((era, index) => (
                <React.Fragment key={era.id}>
                  {index === 0 && <TableHead className="text-right">{era.startYear}</TableHead>}
                  <TableHead className="text-right">Addition</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                  <TableHead className="text-right">{era.endYear}</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {nations.map((nation) => (
              <TableRow key={nation.name}>
                <TableCell>
                  <Link href={`/nations/${nation.id}`}>{nation.name}</Link>
                </TableCell>
                {sortedEras.map((era, index) => {
                  const growth = era.growths?.find((g: any) => g.nation.name === nation.name);
                  const addition = era.additions?.find((a: any) => a.nation.name === nation.name);
                  const isStartingEra = nation.startYear === era.endYear;
                  
                  if (!growth) {
                    return (
                      <React.Fragment key={era.id}>
                        {index === 0 && <TableCell className="text-right">-</TableCell>}
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">-</TableCell>
                        <TableCell className="text-right">
                          {isStartingEra ? nation.startPop.toLocaleString() : '-'}
                        </TableCell>
                      </React.Fragment>
                    );
                  }
                  
                  return (
                    <React.Fragment key={era.id}>
                      {index === 0 && <TableCell className="text-right">{growth.startPopulation.toLocaleString()}</TableCell>}
                      <TableCell className="text-right">
                        {addition ? (
                          <span className={addition.amount > 0 ? "text-green-500" : "text-red-500"}>
                            {addition.amount > 0 ? "+" : ""}{addition.amount.toLocaleString()}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right">{growth.growthRate.toFixed(3)}%</TableCell>
                      <TableCell className="text-right">
                        {isStartingEra ? nation.startPop.toLocaleString() : growth.endPopulation.toLocaleString()}
                      </TableCell>
                    </React.Fragment>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 