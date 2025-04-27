import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Suspense } from "react";
import React from "react";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { TimelineTable } from "@/components/timeline-table";

async function getEras() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/eras`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch eras');
  }
  return res.json();
}

function LoadingSkeleton() {
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 px-4 scrollbar-hide">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nation</TableHead>
              {[1, 2, 3].map((i) => (
                <React.Fragment key={i}>
                  <TableHead className="text-right">Year</TableHead>
                  <TableHead className="text-right">Addition</TableHead>
                  <TableHead className="text-right">Growth</TableHead>
                  <TableHead className="text-right">Year</TableHead>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                {[1, 2, 3].map((j) => (
                  <React.Fragment key={j}>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[60px] ml-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                  </React.Fragment>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function EraList({ eras }: { eras: any[] }) {
  const sortedEras = [...eras].sort((a, b) => a.endYear - b.endYear);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Years</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Nations</TableHead>
          <TableHead>Additions</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedEras.map((era) => (
          <TableRow key={era.id}>
            <TableCell className="font-medium">{era.name}</TableCell>
            <TableCell>{era.startYear} - {era.endYear}</TableCell>
            <TableCell>{era.description || '-'}</TableCell>
            <TableCell>{era.growths?.length || 0}</TableCell>
            <TableCell>
              {era.additions?.length ? (
                <span className="text-muted-foreground">
                  {era.additions.length} change{era.additions.length === 1 ? '' : 's'}
                </span>
              ) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/eras/${era.id}`}>View Details</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ErasPage() {
  const eras = await getEras();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eras</h1>
          <p className="text-muted-foreground">
            Manage time periods and track population changes
          </p>
        </div>
        <Button asChild>
          <Link href="/eras/new">
            <Clock className="mr-2 h-4 w-4" />
            New Era
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Population Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LoadingSkeleton />}>
            <TimelineTable eras={eras} />
          </Suspense>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Eras</CardTitle>
        </CardHeader>
        <CardContent>
          <EraList eras={eras} />
        </CardContent>
      </Card>
    </div>
  );
} 