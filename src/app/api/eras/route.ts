import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Era } from '@prisma/client';

interface EraRequest extends NextRequest {
  json: () => Promise<Era>;
}

export async function createEra(data: Omit<Era, "id" | "createdAt" | "updatedAt">) {
  const era = await prisma.era.create({
    data: {
      name: data.name,
      startYear: data.startYear,
      endYear: data.endYear,
      description: data.description,
      startDate: new Date(data.startYear, 0, 1),
      endDate: new Date(data.endYear, 11, 31),
    },
  });
  return era;
}

export async function POST(request: EraRequest) {
  try {
    const body = await request.json();
    const era = await createEra(body)

    return NextResponse.json(era);
  } catch (error) {
    console.error('Error creating era:', error);
    return NextResponse.json(
      { error: 'Failed to create era' },
      { status: 500 }
    );
  }
}

export async function getEras() {
  const eras = await prisma.era.findMany({
    orderBy: [
      { startYear: 'asc' },
      { endYear: 'asc' },
    ],
    include: {
      growths: {
        include: {
          nation: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
      additions: {
        include: {
          nation: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
  return eras;
}

export async function GET() {
  try {
    const eras = await getEras();

    return NextResponse.json(eras);
  } catch (error) {
    console.error('Error fetching eras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eras' },
      { status: 500 }
    );
  }
} 