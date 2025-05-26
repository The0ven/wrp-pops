import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Addition } from '@prisma/client';

interface AdditionRequest extends NextRequest {
  json: () => Promise<Addition>;
}

export async function createAddition(data: Omit<Addition, "id" | "createdAt" | "updatedAt">) {
  const addition = await prisma.addition.create({
    data: {
      nationId: data.nationId,
      eraId: data.eraId,
      year: data.year,
      amount: data.amount,
      notes: data.notes,
    },
    include: {
      nation: true,
      era: true,
    },
  });
  return addition;
}
export async function POST(request: AdditionRequest) {
  try {
    const body = await request.json();

    if (!body.nationId || !body.eraId || !body.year || body.amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const addition = await createAddition(body)
    return NextResponse.json(addition);
  } catch (error) {
    console.error('Error creating addition:', error);
    return NextResponse.json(
      { error: 'Failed to create addition' },
      { status: 500 }
    );
  }
}

export async function getAdditions(nationId: string, eraId: string) {
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
  return additions;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nationId = searchParams.get('nationId');
    const eraId = searchParams.get('eraId');

    if (!nationId || !eraId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    return NextResponse.json(await getAdditions(nationId, eraId));
  } catch (error) {
    console.error('Error fetching additions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch additions' },
      { status: 500 }
    );
  }
} 