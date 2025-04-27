"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Era {
  id: string;
  name: string;
  endYear: number;
}

interface Nation {
  name: string;
  population: number;
}

interface Report {
  era: {
    name: string;
    endYear: number;
  };
  totalPopulation: number;
  highestPopulatedRegion: string;
  highestPopulatedNation: string;
  regions: Record<string, Nation[]>;
}

export default function ReportsPage() {
  const [eras, setEras] = useState<Era[]>([]);
  const [selectedEraId, setSelectedEraId] = useState<string>("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  const formatPopulation = (population: number) => {
    const formatted = population.toLocaleString();
    return population >= 1000000 ? `**${formatted}**` : `*${formatted}*`;
  };

  useEffect(() => {
    const fetchEras = async () => {
      try {
        const response = await fetch("/api/eras");
        const data = await response.json();
        setEras(data);
      } catch (error) {
        console.error("Error fetching eras:", error);
      }
    };

    fetchEras();
  }, []);

  useEffect(() => {
    const fetchReport = async () => {
      if (!selectedEraId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/reports?eraId=${selectedEraId}`);
        const data = await response.json();
        setReport(data);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedEraId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Population Reports</h1>
          <p className="text-muted-foreground">
            View population statistics by era
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Era</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedEraId}
            onValueChange={setSelectedEraId}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select an era" />
            </SelectTrigger>
            <SelectContent>
              {eras.map((era) => (
                <SelectItem key={era.id} value={era.id}>
                  {era.name} ({era.endYear} S.Y.)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center">Loading...</div>
      ) : report ? (
        <Card>
          <CardContent className="pt-6">
            <div className="prose dark:prose-invert max-w-none">
              <h1># Population of Arcanis - {report.era.endYear} S.Y.</h1>
              <ul>
                <li>- Total Population: {formatPopulation(report.totalPopulation)}</li>
                <li>- Highest Populated Region: {report.highestPopulatedRegion}</li>
                <li>- Highest Populated Nation: {report.highestPopulatedNation}</li>
              </ul>

              {Object.entries(report.regions).map(([region, nations]) => {
                const regionPopulation = nations.reduce((sum, nation) => sum + nation.population, 0);
                return (
                  <div key={region}>
                    <h2>## __{region}__ - {formatPopulation(regionPopulation)}</h2>
                    <ul>
                      {nations.map((nation, index) => (
                        <li key={nation.name}>
                          {index === 0 ? (
                            <strong>__{nation.name}__</strong>
                          ) : (
                            nation.name
                          )}: {formatPopulation(nation.population)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
} 