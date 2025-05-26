import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Empire } from '@prisma/client';

interface EmpireRequest extends NextRequest {
  json: () => Promise<Empire>;
}

export async function createEmpire(data: Omit<Empire, "id" | "createdAt" | "updatedAt">) {
  const empire = await prisma.empire.create({
    data: {
      name: data.name,
    },
  });
  return empire;
}

export async function POST(request: EmpireRequest) {
  try {
    const body = await request.json();
    const empire = await createEmpire(body)

    return NextResponse.json(empire);
  } catch (error) {
    console.error('Error creating empire:', error);
    return NextResponse.json(
      { error: 'Failed to create empire' },
      { status: 500 }
    );
  }
}

export async function getEmpires() {
  const empires = await prisma.empire.findMany({
    orderBy: [
      { name: 'asc' },
    ],
    include: {
      vassals: {
        orderBy: {
          name: 'asc',
        },
      },
    },
  });
  return empires;
}

export async function GET() {
  try {
    const empires = await getEmpires();

    return NextResponse.json(empires);
  } catch (error) {
    console.error('Error fetching empires:', error);
    return NextResponse.json(
      { error: 'Failed to fetch empires' },
      { status: 500 }
    );
  }
} 