import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Era } from '@prisma/client';

interface EraRequest extends NextRequest {
  json: () => Promise<Era>;
}

export async function POST(request: EraRequest) {
  try {
    const body = await request.json();
    const { name, startYear, endYear, description } = body;

    const era = await prisma.era.create({
      data: {
        name,
        startYear,
        endYear,
        startDate: new Date(startYear, 0, 1),
        endDate: new Date(endYear, 11, 31),
        description,
      },
    });

    return NextResponse.json(era);
  } catch (error) {
    console.error('Error creating era:', error);
    return NextResponse.json(
      { error: 'Failed to create era' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
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

    return NextResponse.json(eras);
  } catch (error) {
    console.error('Error fetching eras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eras' },
      { status: 500 }
    );
  }
} 