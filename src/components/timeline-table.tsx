"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Nation } from "@prisma/client";
import Link from "next/link";
import {
  calculatePopulation,
  startingPopulation,
  type EraRecords,
} from "@/lib/population";
import { submitPopulationRecords } from "@/actions/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Edit = { addition: string; growth: string };
export function TimelineTable({
  eras,
  nations,
}: {
  eras: EraRecords[];
  nations: Nation[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const [nameFilter, setNameFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [selectedEra, setSelectedEra] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    try {
      const value = JSON.parse(
        localStorage.getItem("timelineTableFilters") ?? "{}",
      );
      if (typeof value.showArchived === "boolean")
        setShowArchived(value.showArchived);
      if (typeof value.nameFilter === "string") setNameFilter(value.nameFilter);
      if (typeof value.regionFilter === "string")
        setRegionFilter(value.regionFilter);
    } catch {
      /* Filters are optional when browser storage is unavailable. */
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (hydrated)
      try {
        localStorage.setItem(
          "timelineTableFilters",
          JSON.stringify({ showArchived, nameFilter, regionFilter }),
        );
      } catch {
        /* optional */
      }
  }, [hydrated, showArchived, nameFilter, regionFilter]);
  const dirty = Object.keys(edits).length > 0;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const sortedEras = [...eras].sort(
    (a, b) => a.endYear - b.endYear || a.startYear - b.startYear,
  );
  const regions = [...new Set(nations.map((n) => n.region))].sort();
  const visible = nations
    .filter(
      (n) =>
        (showArchived || !n.isArchived) &&
        (!regionFilter || n.region === regionFilter) &&
        n.name.toLowerCase().includes(nameFilter.toLowerCase()),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  function selectEra(id: string) {
    if (saving || (dirty && id !== selectedEra)) {
      setError("Save or cancel your edits before switching eras.");
      return;
    }
    setSelectedEra(id);
    setError(null);
    setSaved(false);
  }
  function edit(
    nationId: string,
    key: keyof Edit,
    value: string,
    current: Edit,
  ) {
    setEdits((old) => ({
      ...old,
      [nationId]: { ...current, ...old[nationId], [key]: value },
    }));
    setSaved(false);
    setError(null);
  }
  async function save() {
    if (!selectedEra) return;
    setSaving(true);
    setError(null);
    try {
      const records = Object.entries(edits).map(([nationId, values]) => {
        if (!values.addition.trim() || !values.growth.trim())
          throw new Error(
            "Addition and growth rate are required. Enter 0 for no change.",
          );
        return {
          nationId,
          eraId: selectedEra,
          amount: Number(values.addition),
          growthRate: Number(values.growth),
        };
      });
      const result = await submitPopulationRecords(records);
      if (!result.success) throw new Error(result.message);
      setEdits({});
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["nations"] });
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Save failed. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (!eras.length)
    return (
      <p className="text-sm text-muted-foreground">
        No eras yet.{" "}
        <Link className="underline" href="/eras/new">
          Create an era
        </Link>{" "}
        to start tracking populations.
      </p>
    );
  return (
    <div className="space-y-4">
      <div className="mb-4 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Filter Nations
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filter Nations</DropdownMenuLabel>
            <div className="space-y-2 px-2 py-2">
              <Input
                aria-label="Search nations"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Escape") e.stopPropagation();
                }}
                placeholder="Search by name..."
                className="h-8"
              />
              <div>
                <DropdownMenuLabel className="px-0 pb-1">
                  Continent/Region
                </DropdownMenuLabel>
                <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                  <DropdownMenuItem
                    onSelect={() => setRegionFilter("")}
                    className={
                      regionFilter === "" ? "font-semibold bg-accent/30" : ""
                    }
                  >
                    All
                  </DropdownMenuItem>
                  {regions.map((region) => (
                    <DropdownMenuItem
                      key={region}
                      onSelect={() => setRegionFilter(region)}
                      className={
                        regionFilter === region
                          ? "font-semibold bg-accent/30"
                          : ""
                      }
                    >
                      {region}
                    </DropdownMenuItem>
                  ))}
                </div>
              </div>
              <DropdownMenuSeparator />
              <div className="flex items-center gap-2 px-1">
                <Switch
                  id="show-archived"
                  checked={showArchived}
                  onCheckedChange={setShowArchived}
                />
                <Label htmlFor="show-archived" className="cursor-pointer">
                  Show Archived Nations
                </Label>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {dirty && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            {Object.keys(edits).length} unsaved record(s)
          </span>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setEdits({});
              setError(null);
            }}
          >
            Cancel edits
          </Button>
          <Button disabled={saving} onClick={save}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-green-600">
          Population records saved.
        </p>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">
                Nation
              </TableHead>
              {sortedEras.map((era) => (
                <TableHead key={era.id} colSpan={3} className="text-center">
                  <Button
                    variant={selectedEra === era.id ? "secondary" : "ghost"}
                    onClick={() => selectEra(era.id)}
                    disabled={saving}
                    aria-pressed={selectedEra === era.id}
                  >
                    {era.name} ({era.startYear}–{era.endYear})
                  </Button>
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card" />
              {sortedEras.flatMap((era) =>
                ["Addition", "Growth", "Population"].map((label) => (
                  <TableHead key={`${era.id}-${label}`} className="text-right">
                    {label}
                  </TableHead>
                )),
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((nation) => (
              <TableRow key={nation.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium">
                  <Link href={`/nations/${nation.id}`}>{nation.name}</Link>
                </TableCell>
                {sortedEras.map((era) => {
                  const growths = era.growths.filter(
                    (g) => g.nationId === nation.id,
                  );
                  const growth = growths[0];
                  const total = era.additions
                    .filter((a) => a.nationId === nation.id)
                    .reduce((sum, a) => sum + a.amount, 0);
                  const editable =
                    era.id === selectedEra &&
                    nation.startYear <= era.endYear &&
                    growths.length <= 1;
                  const values =
                    editable && edits[nation.id]
                      ? edits[nation.id]
                      : {
                          addition: String(total),
                          growth: String(growth?.growthRate ?? 0),
                        };
                  let preview: string | undefined;
                  if (editable && edits[nation.id]) {
                    try {
                      if (!values.addition.trim() || !values.growth.trim())
                        throw new Error();
                      preview = calculatePopulation(
                        startingPopulation(nation, era, eras),
                        Number(values.addition),
                        Number(values.growth),
                        era.endYear - era.startYear,
                      ).toLocaleString();
                    } catch {
                      preview = "Invalid values";
                    }
                  }
                  return [
                    <TableCell
                      key={`${era.id}-addition`}
                      className="text-right"
                    >
                      {editable ? (
                        <Input
                          aria-label={`${nation.name} addition`}
                          type="number"
                          step="1"
                          value={values.addition}
                          disabled={saving}
                          onChange={(e) =>
                            edit(nation.id, "addition", e.target.value, values)
                          }
                          className="h-8 w-20 border-none bg-transparent px-2 py-1 text-right shadow-none"
                        />
                      ) : total !== 0 ? (
                        <span
                          className={
                            total > 0 ? "text-green-500" : "text-red-500"
                          }
                        >
                          {total > 0 ? "+" : ""}
                          {total.toLocaleString()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>,
                    <TableCell key={`${era.id}-growth`} className="text-right">
                      {editable ? (
                        <Input
                          aria-label={`${nation.name} growth rate`}
                          type="number"
                          step="0.001"
                          min="-1"
                          value={values.growth}
                          disabled={saving}
                          onChange={(e) =>
                            edit(nation.id, "growth", e.target.value, values)
                          }
                          className="h-8 w-20 border-none bg-transparent px-2 py-0.5 text-right shadow-none"
                        />
                      ) : growth && growth.growthRate !== 0 ? (
                        <span
                          className={
                            growth.growthRate > 0
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {growth.growthRate > 0 ? "+" : ""}
                          {(growth.growthRate * 100).toFixed(2)}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>,
                    <TableCell
                      key={`${era.id}-population`}
                      className="text-right tabular-nums"
                    >
                      {preview !== undefined ? (
                        <span className="font-semibold text-primary">
                          {preview}
                        </span>
                      ) : (
                        (growth?.endPopulation.toLocaleString() ?? "—")
                      )}
                    </TableCell>,
                  ];
                })}
              </TableRow>
            ))}
            {!visible.length && (
              <TableRow>
                <TableCell colSpan={1 + eras.length * 3}>
                  No nations match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
