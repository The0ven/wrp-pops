import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function getReport(eraId: string) {
  // Get the era and its growth records
  const era = await prisma.era.findUnique({
    where: { id: eraId },
    include: {
      growths: {
        include: {
          nation: {
            include: {
              empire: true,
            },
          },
        },
        where: {
          nation: {
            isArchived: false
          }
        }
      },
    },
  });

  if (!era) {
    throw new Error('Era not found');
  }

  // Group nations by region
  const nationsByRegion = era.growths.reduce((acc, growth) => {
    const region = growth.nation.region;
    if (!acc[region]) {
      acc[region] = [];
    }
    acc[region].push({
      name: growth.nation.name,
      population: growth.endPopulation,
    });
    return acc;
  }, {} as Record<string, { name: string; population: number }[]>);

  // Group nations by empire
  const empireData = era.growths.reduce((acc, growth) => {
    const empire = growth.nation.empire;
    if (empire) {
      if (!acc[empire.id]) {
        acc[empire.id] = {
          name: empire.name,
          vassals: [],
          totalPopulation: 0,
        };
      }
      acc[empire.id].vassals.push({
        name: growth.nation.name,
        population: growth.endPopulation,
      });
      acc[empire.id].totalPopulation += growth.endPopulation;
    }
    return acc;
  }, {} as Record<string, { name: string; vassals: { name: string; population: number }[]; totalPopulation: number }>);

  // Sort vassals within each empire by population (descending)
  Object.values(empireData).forEach(empire => {
    empire.vassals.sort((a, b) => b.population - a.population);
  });

  // Convert empireData to array and sort by total population (descending)
  const sortedEmpires = Object.entries(empireData)
    .sort(([, a], [, b]) => b.totalPopulation - a.totalPopulation)
    .reduce((acc, [id, empire]) => {
      acc[id] = empire;
      return acc;
    }, {} as Record<string, { name: string; vassals: { name: string; population: number }[]; totalPopulation: number }>);

  // Calculate total population
  const totalPopulation = era.growths.reduce((sum, growth) => sum + growth.endPopulation, 0);

  // Find highest populated region
  const highestPopulatedRegion = Object.entries(nationsByRegion).reduce(
    (highest, [region, nations]) => {
      const regionTotal = nations.reduce((sum, nation) => sum + nation.population, 0);
      return regionTotal > highest.population
        ? { region, population: regionTotal }
        : highest;
    },
    { region: '', population: 0 }
  );

  // Find highest populated nation
  const highestPopulatedNation = era.growths.reduce(
    (highest, growth) =>
      growth.endPopulation > highest.population
        ? { name: growth.nation.name, population: growth.endPopulation }
        : highest,
    { name: '', population: 0 }
  );

  // Sort nations within each region
  Object.keys(nationsByRegion).forEach(region => {
    nationsByRegion[region].sort((a, b) => {
      // First sort by population (descending)
      if (b.population !== a.population) {
        return b.population - a.population;
      }
      // Then alphabetically
      return a.name.localeCompare(b.name);
    });
  });

  return {
    era,
    totalPopulation,
    highestPopulatedRegion,
    highestPopulatedNation,
    nationsByRegion,
    empires: sortedEmpires,
  };
}
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eraId = searchParams.get('eraId');

    if (!eraId) {
      return NextResponse.json(
        { error: 'Era ID is required' },
        { status: 400 }
      );
    }

    const { era, totalPopulation, highestPopulatedRegion, highestPopulatedNation, nationsByRegion, empires } = await getReport(eraId)

    return NextResponse.json({
      era: {
        name: era.name,
        endYear: era.endYear,
      },
      totalPopulation,
      highestPopulatedRegion: highestPopulatedRegion.region,
      highestPopulatedNation: highestPopulatedNation.name,
      regions: nationsByRegion,
      empires,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
