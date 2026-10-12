import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { TimelineTable } from "@/components/timeline-table";
import { getPopulationTimeline } from "@/app/api/_lib/queries";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingSkeleton() {
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 px-4 scrollbar-hide">
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default async function PopulationPage() {
  const { eras, nations } = await getPopulationTimeline();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Population Timeline</h1>
          <p className="text-muted-foreground">
            Track population changes across all nations and eras
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Population Timeline Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingSkeleton />}>
            <TimelineTable eras={eras} nations={nations} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
