import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Nation } from '@/types/population';

interface NationRequest extends NextRequest {
  json: () => Promise<Nation>;
}

export async function POST(request: NationRequest) {
  try {
    const body = await request.json();
    const { name, description, region, isArchived, startYear, startPopulation, vassalIds } = body;

    const nation = await prisma.nation.create({
      data: {
        name,
        description,
        region,
        isArchived,
        startYear,
        startPopulation,
        vassalIds: vassalIds,
      },
    });

    return NextResponse.json(nation);
  } catch (error) {
    console.error('Error creating nation:', error);
    return NextResponse.json(
      { error: 'Failed to create nation' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const nations = await prisma.nation.findMany({
      orderBy: [
        { isArchived: 'asc' }, // Active nations first
        { region: 'asc' },     // Then by region
        { name: 'asc' },       // Then alphabetically by name
      ],
      include: {
        growths: {
          include: {
            era: true,
          },
        },
      },
    });

    // Parse vassalIds for each nation
    const nationsWithParsedVassals = nations.map((nation) => ({
      ...nation,
      vassalIds: nation.vassalIds,
    }));

    return NextResponse.json(nationsWithParsedVassals);
  } catch (error) {
    console.error('Error fetching nations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nations' },
      { status: 500 }
    );
  }
} 