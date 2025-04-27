import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Growth } from '@prisma/client';

interface GrowthRequest extends NextRequest {
  json: () => Promise<Growth>;
}

export async function POST(request: GrowthRequest) {
  try {
    const body = await request.json();
    const { nationId, eraId, startPopulation, growthRate, endPopulation, notes } = body;

    // Check if a growth record already exists for this nation and era
    const existingGrowth = await prisma.growth.findFirst({
      where: {
        nationId,
        eraId,
      },
    });

    if (existingGrowth) {
      return NextResponse.json(
        { error: 'A growth record already exists for this nation and era' },
        { status: 400 }
      );
    }

    // Get the era to find its end year
    const era = await prisma.era.findUnique({
      where: { id: eraId },
    });

    if (!era) {
      return NextResponse.json(
        { error: 'Era not found' },
        { status: 404 }
      );
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
    const calculatedEndPopulation = Math.round(adjustedStartPopulation * (1 + growthRate));

    const growth = await prisma.growth.create({
      data: {
        startPopulation: startPopulation,
        endPopulation: endPopulation || calculatedEndPopulation,
        growthRate,
        notes,
        nationId,
        eraId,
      },
      include: {
        nation: true,
        era: true,
      },
    });

    return NextResponse.json(growth);
  } catch (error) {
    console.error('Error creating growth record:', error);
    return NextResponse.json(
      { error: 'Failed to create growth record' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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

    return NextResponse.json(growths);
  } catch (error) {
    console.error('Error fetching growth records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch growth records' },
      { status: 500 }
    );
  }
} 