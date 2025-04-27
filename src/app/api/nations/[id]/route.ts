import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Nation } from '@prisma/client';

interface NationRequest extends NextRequest {
  json: () => Promise<Nation>;
}

export async function GET(
  request: NationRequest,
  { params }: Promise<{ id: string }>
) {
  try {
    const nation = await prisma.nation.findUnique({
      where: { id: (await params).id },
      include: {
        growths: {
          include: {
            era: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!nation) {
      return NextResponse.json(
        { error: 'Nation not found' },
        { status: 404 }
      );
    }

    // Parse vassalIds
    const nationWithParsedVassals = {
      ...nation,
      vassalIds: nation.vassalIds || '[]',
    };

    return NextResponse.json(nationWithParsedVassals);
  } catch (error) {
    console.error('Error fetching nation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nation' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NationRequest,
  { params }: Promise<{ id: string }>
) {
  try {
    const body = await request.json();
    const { name, description, region, isArchived, startYear, startPopulation, vassalIds } = body;

    // Update the nation with new data and vassal relationships
    const nation = await prisma.nation.update({
      where: { id: (await params).id },
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

    // Parse vassalIds for response
    const nationWithParsedVassals = {
      ...nation,
      vassalIds: nation.vassalIds || '[]',
    };

    return NextResponse.json(nationWithParsedVassals);
  } catch (error) {
    console.error('Error updating nation:', error);
    return NextResponse.json(
      { error: 'Failed to update nation' },
      { status: 500 }
    );
  }
}  