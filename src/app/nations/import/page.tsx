"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useImportStore } from "@/stores/import-store";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function ImportNationsPage() {
  const {
    csvData,
    importedNations,
    error,
    isSubmitting,
    success,
    setCsvData,
    parseCsvData,
    submitNations,
    reset,
  } = useImportStore();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (success) void queryClient.invalidateQueries({ queryKey: ["nations"] });
  }, [success, queryClient]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/nations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Import Nations</h1>
          <p className="text-muted-foreground">
            Import nations and their eras from CSV data
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv">Paste CSV Data</Label>
              <Textarea
                id="csv"
                placeholder="Region,Name,Start Year,Start Pop,ADD 110,RATE 110,110&#10;North,Example Nation,100,1000,100,0.01,1215"
                value={csvData}
                disabled={isSubmitting}
                onChange={(e) => setCsvData(e.target.value)}
                className="min-h-[200px] font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={parseCsvData}
                disabled={isSubmitting}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-colors"
              >
                Parse Data
              </Button>
              <Button
                onClick={() => {
                  reset();
                }}
                disabled={isSubmitting}
                variant="destructive"
              >
                Reset Store
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <Button
              onClick={submitNations}
              disabled={isSubmitting || importedNations.length === 0}
            >
              {isSubmitting ? "Importing..." : "Import Nations"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {success && (
              <p role="status" className="text-green-600">
                {success}
              </p>
            )}
            {error ? (
              <div role="alert" className="text-sm text-red-500">
                {error}
              </div>
            ) : importedNations.length > 0 ? (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Found {importedNations.length} nations to import:
                </div>
                <div className="space-y-2">
                  {importedNations.map((nation, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{nation.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {nation.region}
                          </p>
                        </div>
                        {nation.isArchived && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              Will be archived
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        {nation.eras?.map((era, eraIndex) => (
                          <div
                            key={eraIndex}
                            className="text-sm text-muted-foreground pl-4"
                          >
                            Era {era.startYear}-{era.endYear}:
                            <div className="pl-4">
                              Growth Rate: {(era.rate * 100).toFixed(2)}%
                            </div>
                            <div className="pl-4">
                              Population: {era.startPop.toLocaleString()} →{" "}
                              {era.endPop.toLocaleString()}
                            </div>
                            {nation.additions
                              ?.filter(
                                (addition) => addition.year === era.endYear,
                              )
                              .map(
                                (addition, addIndex) =>
                                  addition.amount !== 0 && (
                                    <div key={addIndex} className="pl-4">
                                      Addition in {addition.year}:{" "}
                                      {addition.amount > 0 ? "+" : ""}
                                      {addition.amount.toLocaleString()}
                                    </div>
                                  ),
                              )}
                          </div>
                        ))}
                        {(!nation.eras || nation.eras.length === 0) && (
                          <div className="text-sm text-muted-foreground pl-4">
                            No eras found for this nation
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={submitNations}
                  disabled={isSubmitting || importedNations.length === 0}
                >
                  Import Nations
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No nations to import yet. Paste your data and click "Parse
                Data".
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
