import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Growth } from '@prisma/client';
import { getEra } from '../eras/[id]/route';

interface GrowthRequest extends NextRequest {
  json: () => Promise<Growth>;
}

export async function createGrowth(data: Omit<Growth, "id" | "createdAt" | "updatedAt">) {
  const growth = await prisma.growth.create({
    data: {
      startPopulation: data.startPopulation,
      endPopulation: data.endPopulation,
      growthRate: data.growthRate,
      notes: data.notes,
      nation: {
        connect: {
          id: data.nationId
        }
      },
      era: {
        connect: {
          id: data.eraId
        }
      },
    },
    include: {
      nation: true,
      era: true,
    },
  });
  return growth;

}

export async function calculateGrowth(data: Omit<Growth, "id" | "createdAt" | "updatedAt">): Promise<Omit<Growth, "id" | "createdAt" | "updatedAt">> {
  const { nationId, eraId, startPopulation, growthRate, endPopulation, notes } = data;
  // Get the era to find its end year
  const era = await getEra(eraId)

  if (!era) {
    throw new Error('Era not found');
  }

  // Find any additions for this nation in this era's end year
  const additions = await prisma.addition.findMany({
    where: {
      nationId,
      year: era.endYear,
    },
  });

  // Calculate total additions
  const totalAdditions = additions.reduce((sum, addition) => sum + addition.amount, 0);

  // Add additions to start population
  const adjustedStartPopulation = startPopulation + totalAdditions;

  // Calculate end population based on adjusted start population and growth rate
  let calculatedEndPopulation = Math.round(adjustedStartPopulation * Math.pow((1 + growthRate), (era.endYear - era.startYear)));
  if (growthRate === -1) {
    calculatedEndPopulation = 0
  }
  return {
    startPopulation: adjustedStartPopulation,
    endPopulation: calculatedEndPopulation,
    growthRate: growthRate,
    notes: notes,
    nationId: nationId,
    eraId: eraId,
  }
}

export async function POST(request: GrowthRequest) {
  try {
    const body = await request.json();
    let growth: Omit<Growth, "id" | "createdAt" | "updatedAt">
    try {
      growth = await calculateGrowth(body)
    } catch (error) {
      console.error('Error calculating growth:', error);
      return NextResponse.json(
        { error: `Failed to calculate growth: ${error}`},
        { status: 500 }
      );
    }
    
    const createdGrowth = await createGrowth(growth)

    return NextResponse.json(createdGrowth);
  } catch (error) {
    console.error('Error creating growth record:', error);
    return NextResponse.json(
      { error: 'Failed to create growth record' },
      { status: 500 }
    );
  }
}


export async function getGrowths() {
  const growths = await prisma.growth.findMany({
    orderBy: [
      { era: { startYear: 'asc' } },
      { era: { endYear: 'asc' } },
      { createdAt: 'desc' },
    ],
    include: {
      nation: true,
      era: true,
    },
  });
  return growths;
}

export async function GET() {
  try {
    const growths = await getGrowths();

    return NextResponse.json(growths);
  } catch (error) {
    console.error('Error fetching growth records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth records' },
      { status: 500 }
    );
  }
} 
