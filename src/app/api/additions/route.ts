import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Addition } from '@prisma/client';

interface AdditionRequest extends NextRequest {
  json: () => Promise<Addition>;
}


export async function POST(request: AdditionRequest) {
  try {
    const body = await request.json();
    const { nationId, eraId, year, amount, notes } = body;

    if (!nationId || !eraId || !year || amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if an addition already exists for this nation and year
    const existingAddition = await prisma.addition.findFirst({
      where: {
        nationId,
        year,
      },
    });

    if (existingAddition) {
      return NextResponse.json(
        { error: 'An addition already exists for this nation and year' },
        { status: 400 }
      );
    }

    const addition = await prisma.addition.create({
      data: {
        nationId,
        eraId,
        year,
        amount,
        notes,
      },
      include: {
        nation: true,
        era: true,
      },
    });

    return NextResponse.json(addition);
  } catch (error) {
    console.error('Error creating addition:', error);
    return NextResponse.json(
      { error: 'Failed to create addition' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nationId = searchParams.get('nationId');
    const eraId = searchParams.get('eraId');

    const additions = await prisma.addition.findMany({
      where: {
        ...(nationId && { nationId }),
        ...(eraId && { eraId }),
      },
      orderBy: [
        { year: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        nation: true,
        era: true,
      },
    });

    return NextResponse.json(additions);
  } catch (error) {
    console.error('Error fetching additions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch additions' },
      { status: 500 }
    );
  }
} 