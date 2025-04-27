import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get the era and its growth records
    const era = await prisma.era.findUnique({
      where: { id: eraId },
      include: {
        growths: {
          include: {
            nation: true,
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
      return NextResponse.json(
        { error: 'Era not found' },
        { status: 404 }
      );
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

    return NextResponse.json({
      era: {
        name: era.name,
        endYear: era.endYear,
      },
      totalPopulation,
      highestPopulatedRegion: highestPopulatedRegion.region,
      highestPopulatedNation: highestPopulatedNation.name,
      regions: nationsByRegion,
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
} 