"use client"

import React, { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Nation, Era } from "@prisma/client";

// Helper to calculate startPop for a nation in a given era
function getStartPop({ nation, era, index, sortedEras }: { nation: Nation, era: Era, index: number, sortedEras: Era[] }) {
  if (nation.startYear > era.startYear && nation.startYear < era.endYear) {
    return 0;
  }
  const prevEra = sortedEras[index - 1];
  const prevGrowth = prevEra?.growths?.find((g: any) => g.nation.name === nation.name);
  return prevGrowth ? prevGrowth.endPopulation : 0;
}

export function TimelineTable({ eras }: { eras: any[] }) {
  // Always initialize with default values to ensure server/client consistency
  const [showArchived, setShowArchived] = React.useState(false);
  const [nameFilter, setNameFilter] = React.useState("");
  const [regionFilter, setRegionFilter] = React.useState("");
  const [isHydrated, setIsHydrated] = React.useState(false);
  
  // Load persisted filters after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("timelineTableFilters");
      if (saved) {
        try {
          const { showArchived: savedShowArchived, nameFilter: savedNameFilter, regionFilter: savedRegionFilter } = JSON.parse(saved);
          setShowArchived(typeof savedShowArchived === "boolean" ? savedShowArchived : false);
          setNameFilter(typeof savedNameFilter === "string" ? savedNameFilter : "");
          setRegionFilter(typeof savedRegionFilter === "string" ? savedRegionFilter : "");
        } catch {}
      }
      setIsHydrated(true);
    }
  }, []);
  
  // Persist filters to localStorage (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(
        "timelineTableFilters",
        JSON.stringify({ showArchived, nameFilter, regionFilter })
      );
    }
  }, [showArchived, nameFilter, regionFilter, isHydrated]);
  
  // Sort eras by end year in ascending order
  const sortedEras = [...eras].sort((a, b) => a.endYear - b.endYear);
  
  // Get all unique nations across all eras and their start years
  const allNations = new Map<string, { name: string; startYear: number; startPop: number; isArchived: boolean; id: string; region?: string }>();
  eras.forEach(era => {
    era.growths?.forEach((growth: any) => {
      if (!allNations.has(growth.nation.name)) {
        allNations.set(growth.nation.name, {
          name: growth.nation.name,
          startYear: growth.nation.startYear,
          startPop: growth.nation.startPopulation,
          isArchived: growth.nation.isArchived,
          id: growth.nation.id,
          region: growth.nation.region || "Unknown"
        });
      }
    });
  });
  // Get unique regions for filter dropdown
  const regionSet = new Set<string>();
  allNations.forEach(n => regionSet.add(n.region || "Unknown"));
  const regionOptions = Array.from(regionSet).sort();

  // Filter nations by archived, region, and name
  const nations = Array.from(allNations.values())
    .filter(nation => (showArchived || !nation.isArchived))
    .filter(nation => regionFilter === "" || nation.region === regionFilter)
    .filter(nation => nameFilter === "" || nation.name.toLowerCase().includes(nameFilter.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (sortedEras.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No eras created yet. Create your first era to start tracking populations.
      </div>
    );
  }

  const [hoveredEra, setHoveredEra] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState<number | null>(null);
  // Edits: { [nationId]: { addition: string, growth: string } }
  const [edits, setEdits] = useState<Record<string, { addition: string; growth: string }>>({});
  
  // Handlers for mouse events
  const handleMouseEnter = (eraIndex: number) => setHoveredEra(eraIndex);
  const handleMouseLeave = () => setHoveredEra(null);

  const handleEraClick = (eraIndex: number) => setSelectedEra(eraIndex);

  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  return (
    <div className="relative">
      {/* Unified Filter Dropdown */}
      <div className="mb-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">Filter Nations</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Filter Nations</DropdownMenuLabel>
            <div className="px-2 py-2 space-y-2">
              {/* Name search */}
              <Input
                placeholder="Search by name..."
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                className="h-8"
              />
              {/* Region select */}
              <div>
                <DropdownMenuLabel className="px-0 pb-1">Continent/Region</DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <DropdownMenuItem
                    onSelect={() => setRegionFilter("")}
                    className={regionFilter === "" ? "font-semibold bg-accent/30" : ""}
                  >
                    All
                  </DropdownMenuItem>
                  {regionOptions.map(region => (
                    <DropdownMenuItem
                      key={region}
                      onSelect={() => setRegionFilter(region)}
                      className={regionFilter === region ? "font-semibold bg-accent/30" : ""}
                    >
                      {region}
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              {/* Show archived switch */}
              <div className="flex items-center gap-2 px-1">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="cursor-pointer">Show Archived Nations</Label>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Global Save/Cancel bar */}
      {selectedEra !== null && Object.keys(edits).length > 0 && (
        <div className="flex gap-2 mb-2 justify-end">
          <Button size="sm" variant="outline" onClick={() => setEdits({})}>Cancel</Button>
          <Button size="sm" onClick={async () => {
            if (selectedEra === null) return;
            setIsSaving(true);
            const era = sortedEras[selectedEra];
            const savePromises = Object.entries(edits).map(async ([nationId, { addition, growth }]) => {
              // Find nation, growth, and addition for this era
              const nation = nations.find(n => n.id === nationId);
              if (!nation) return;
              const growthObj = era.growths?.find((g: any) => g.nation.id === nationId);
              const additionObj = era.additions?.find((a: any) => a.nation.id === nationId);
              // Calculate startPopulation for this era
              let startPopulation;
              if (growthObj) {
                startPopulation = growthObj.startPopulation;
              } else {
                // If not the first era, use the previous era's endPopulation for this nation
                if (selectedEra > 0) {
                  const prevEra = sortedEras[selectedEra - 1];
                  const prevGrowth = prevEra.growths?.find((g: any) => g.nation.id === nationId);
                  if (prevGrowth) {
                    startPopulation = prevGrowth.endPopulation;
                  } else {
                    startPopulation = nation.startPop;
                  }
                } else {
                  startPopulation = nation.startPop;
                }
              }
              // Calculate endPopulation
              const editedAddition = addition !== undefined ? Number(addition) : (additionObj ? additionObj.amount : 0);
              const editedGrowth = growth !== undefined ? Number(growth) : (growthObj ? growthObj.growthRate : 0);
              const adjustedStartPop = startPopulation + editedAddition;
              let endPopulation = 0;
              if (editedGrowth === -1) {
                endPopulation = 0;
              } else {
                endPopulation = Math.round(adjustedStartPop * Math.pow((1 + editedGrowth / 100), (era.endYear - era.startYear)));
              }
              // Save growth
              if (growthObj) {
                await fetch(`/api/growths/${growthObj.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    startPopulation,
                    growthRate: editedGrowth,
                    endPopulation,
                  }),
                });
              } else {
                await fetch(`/api/growths`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    nationId,
                    eraId: era.id,
                    startPopulation,
                    growthRate: editedGrowth,
                    endPopulation,
                  }),
                });
              }
              // Save addition
              if (additionObj) {
                await fetch(`/api/additions/${additionObj.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    amount: editedAddition,
                  }),
                });
              } else {
                await fetch(`/api/additions`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    nationId,
                    eraId: era.id,
                    year: era.endYear,
                    amount: editedAddition,
                  }),
                });
              }
            });
            await Promise.all(savePromises);
            setEdits({});
            setIsSaving(false);
            queryClient.invalidateQueries({ queryKey: ['eras'] });
          }} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto pb-4 px-4 scrollbar-hide">
        <Table>
        <TableHeader>
      <TableRow>
        <TableHead onClick={() => setSelectedEra(null)} className="sticky left-0 z-20 bg-card border-r border-r-border">Nation</TableHead>
        
        {sortedEras.map((era, eraIndex) => (
          <React.Fragment key={era.id}>
            {eraIndex === 0 && <TableHead className="text-right">{era.startYear}</TableHead>}
            {/* Use an array to avoid repetition */}
            {[
              { label: "Addition" },
              { label: "Growth" },
              { label: era.endYear }
            ].map((column, colIndex) => (
              <TableHead 
                key={`${era.id}-${colIndex}`}
                className={`text-right ${hoveredEra === eraIndex ? 'bg-muted/50' : ''} ${selectedEra === eraIndex ? 'bg-muted' : ''}`}
                onMouseEnter={() => handleMouseEnter(eraIndex)}
                onMouseLeave={handleMouseLeave}
                onClick={() => handleEraClick(eraIndex)}  
              >
                {column.label}
              </TableHead>
            ))}
          </React.Fragment>
        ))}
      </TableRow>
    </TableHeader>
          <TableBody>
            {nations.map((nation) => (
              <TableRow key={nation.name}>
                <TableCell className="sticky left-0 z-10 bg-card border-r border-r-border">
                  <Link href={`/nations/${nation.id}`}>{nation.name}</Link>
                </TableCell>
                {sortedEras.map((era, index) => {
                  const growth = era.growths?.find((g: any) => g.nation.name === nation.name);
                  const addition = era.additions?.find((a: any) => a.nation.name === nation.name);
                  const isEditable = selectedEra === index;
                  
                  let startPop = getStartPop({ nation, era, index, sortedEras });
                  if (nation.startYear > era.endYear) {
                    startPop = 0;
                    if (growth) {
                      growth.startPopulation = 0;
                      growth.endPopulation = 0;
                    }
                  }
                  return (
                    <React.Fragment key={era.id}>
                      {/* First cell - only render for first era */}
                      {index === 0 && (
                        <TableCell className="text-right">
                          {growth && growth.startPopulation !== 0 ? growth.startPopulation.toLocaleString() : '-'}
                        </TableCell>
                      )}
                      
                      {/* Addition cell */}
                      <TableCell className="text-right">
                        {isEditable ? (
                          <Input
                            type="number"
                            value={edits[nation.id]?.addition ?? (addition ? addition.amount.toString() : "0")}
                            onChange={e => setEdits(edits => ({
                              ...edits,
                              [nation.id]: {
                                ...edits[nation.id],
                                addition: e.target.value,
                                growth: edits[nation.id]?.growth ?? (growth ? growth.growthRate.toString() : "0"),
                              }
                            }))}
                            className="w-20 px-2 py-1 h-8 border-none bg-transparent shadow-none"
                          />
                        ) : growth && addition && addition.amount !== 0 ? (
                          <span className={addition.amount > 0 ? "text-green-500" : "text-red-500"}>
                            {addition.amount > 0 ? "+" : ""}{addition.amount.toLocaleString()}
                          </span>
                        ) : "-"}
                      </TableCell>
                      
                      {/* Growth cell */}
                      <TableCell className="text-right">
                        {isEditable ? (
                          <Input
                            type="number"
                            step="0.001"
                            value={edits[nation.id]?.growth ?? (growth ? growth.growthRate.toString() : "0")}
                            onChange={e => setEdits(edits => ({
                              ...edits,
                              [nation.id]: {
                                ...edits[nation.id],
                                growth: e.target.value,
                                addition: edits[nation.id]?.addition ?? (addition ? addition.amount.toString() : "0"),
                              }
                            }))}
                            className="w-20 px-2 py-0.5 h-8 border-none bg-transparent shadow-none"
                          />
                        ) : growth && growth.growthRate !== 0 ? (
                          <span className={growth.growthRate > 0 ? "text-green-500" : "text-red-500"}>
                            {growth.growthRate > 0 ? "+" : ""}{growth.growthRate.toFixed(3)}%
                          </span>
                        ) : "-"}
                      </TableCell>
                      
                      {/* End population cell */}
                      <TableCell className="text-right">
                        {isEditable ? (
                          (() => {
                            const editedAddition = edits[nation.id]?.addition !== undefined 
                              ? Number(edits[nation.id].addition) 
                              : (addition ? addition.amount : 0);
                            const editedGrowth = edits[nation.id]?.growth !== undefined 
                              ? Number(edits[nation.id].growth) 
                              : (growth ? growth.growthRate : 0);
                            let adjustedStartPop = startPop + editedAddition;
                            let previewEndPop = 0;
                            
                            if (editedGrowth === -1) {
                              previewEndPop = 0;
                            } else {
                              previewEndPop = Math.round(adjustedStartPop * Math.pow((1 + editedGrowth / 100), (era.endYear - era.startYear)));
                            }
                            
                            return <span className="font-semibold text-primary">{previewEndPop.toLocaleString()}</span>;
                          })()
                        ) : growth && growth.endPopulation !== 0 ? (
                          growth.endPopulation.toLocaleString()
                        ) : "-"}
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