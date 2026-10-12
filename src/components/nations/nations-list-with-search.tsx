"use client";

import { memo, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useNations } from "@/hooks/use-nations";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { Trash } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { archiveNation } from "@/actions/util";

interface Nation {
  id: string;
  name: string;
  region: string;
  startYear: number;
  startPopulation: number;
  isArchived: boolean;
  growths: Array<{
    endPopulation: number;
    createdAt: string;
  }>;
}

const NationsList = memo(
  ({ nations, isArchived }: { nations: Nation[]; isArchived: boolean }) => {
    const queryClient = useQueryClient();
    const [archiving, setArchiving] = useState<string | null>(null);
    const [archiveError, setArchiveError] = useState<string | null>(null);
    // Memoize the grouped nations and pre-process the latest growth
    const nationsByRegion = useMemo(() => {
      // First, process each nation to calculate its latest growth
      const processedNations = nations.map((nation) => {
        const latestGrowth = nation.growths?.[0];

        return {
          ...nation,
          latestGrowth,
        };
      });

      // Then group the processed nations by region
      return processedNations.reduce(
        (acc, nation) => {
          if (!acc[nation.region]) {
            acc[nation.region] = [];
          }
          acc[nation.region].push(nation);
          return acc;
        },
        {} as Record<string, (Nation & { latestGrowth?: any })[]>,
      );
    }, [nations]);

    if (nations.length === 0) {
      return (
        <div className="text-sm text-muted-foreground">
          No {isArchived ? "archived" : "active"} nations found.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {archiveError && (
          <p role="alert" className="text-sm text-destructive">
            {archiveError}
          </p>
        )}
        {Object.entries(nationsByRegion).map(([region, regionNations]) => (
          <div key={region} className="space-y-4">
            <h3 className="text-lg font-semibold text-muted-foreground">
              {region}
            </h3>
            <div className="space-y-4">
              {regionNations.map((nation) => {
                return (
                  <Link
                    key={nation.id}
                    href={`/nations/${nation.id}`}
                    className="block"
                  >
                    <Card className="hover:bg-secondary-50 transition-colors">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between ">
                          {nation.name}
                          {/* use server action to archive nation */}
                          <Button
                            aria-label={`Archive ${nation.name}`}
                            disabled={archiving !== null || isArchived}
                            variant="destructive"
                            size="icon"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setArchiving(nation.id);
                              setArchiveError(null);
                              try {
                                const result = await archiveNation(nation.id);
                                if (!result.success)
                                  setArchiveError(result.message);
                                else
                                  await queryClient.invalidateQueries({
                                    queryKey: ["nations"],
                                  });
                              } catch {
                                setArchiveError(
                                  "Unable to archive this nation. Please try again.",
                                );
                              } finally {
                                setArchiving(null);
                              }
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-2xl font-bold">
                              {(
                                nation.latestGrowth?.endPopulation ??
                                nation.startPopulation
                              ).toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Current Population
                            </p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold">
                              {nation.startPopulation.toLocaleString()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Start Population ({nation.startYear})
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      JSON.stringify(prevProps.nations) === JSON.stringify(nextProps.nations) &&
      prevProps.isArchived === nextProps.isArchived
    );
  },
);

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-[100px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function NationsListWithSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: nations, isLoading, error } = useNations();

  const activeNations = useMemo(
    () =>
      nations?.filter(
        (nation) =>
          nation.isArchived === false &&
          (nation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nation.region.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [nations, searchTerm],
  );

  const archivedNations = useMemo(
    () =>
      nations?.filter(
        (nation) =>
          nation.isArchived === true &&
          (nation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            nation.region.toLowerCase().includes(searchTerm.toLowerCase())),
      ),
    [nations, searchTerm],
  );

  return (
    <div className="space-y-6">
      <div className="w-full max-w-sm">
        <Input
          type="text"
          placeholder="Search nations by name or region..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-red-500">Error loading nations</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Active Nations</CardTitle>
            </CardHeader>
            <CardContent>
              <NationsList nations={activeNations || []} isArchived={false} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Archived Nations</CardTitle>
            </CardHeader>
            <CardContent>
              <NationsList nations={archivedNations || []} isArchived={true} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
