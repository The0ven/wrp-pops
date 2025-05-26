'use client';

import { memo, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Crown } from "lucide-react";
import { Empire, Growth, Nation } from "@prisma/client";

const EmpiresList = memo(({ empires }: { empires: Empire[] }) => {
  if (empires.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No empires found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {empires.map((empire) => {
        // Calculate total population across all vassals
        const totalPopulation = empire.vassals.reduce((total: number, vassal: Nation) => {
          const latestGrowth = vassal.growths?.sort((a: Growth, b: Growth) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )[0];
          return total + (latestGrowth?.endPopulation || vassal.startPopulation);
        }, 0);

        return (
          <Link key={empire.id} href={`/empires/${empire.id}`} className="block">
            <Card className="hover:bg-secondary-50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  {empire.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {totalPopulation.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Population</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {empire.vassals.length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vassal Nation{empire.vassals.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                {empire.vassals.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Regions:</p>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(empire.vassals.map((v: Nation) => v.region))).map((region: string) => (
                        <span key={region} className="text-xs bg-muted px-2 py-1 rounded">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.empires) === JSON.stringify(nextProps.empires);
});

export function EmpiresListWithSearch({ empires }: { empires: Empire[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmpires = useMemo(() => empires?.filter(empire => 
    empire.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [empires, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="w-full max-w-sm">
        <Input
          type="text"
          placeholder="Search empires by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Empires</CardTitle>
        </CardHeader>
        <CardContent>
          <EmpiresList empires={filteredEmpires || []} />
        </CardContent>
      </Card>
    </div>
  );
} 