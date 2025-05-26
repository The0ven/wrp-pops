import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Nation } from '@prisma/client';

interface NationRequest extends NextRequest {
  json: () => Promise<Nation>;
}

export async function createNation(data: Omit<Nation, "id" | "createdAt" | "updatedAt">) {
  const nation = await prisma.nation.create({
    data: {
      name: data.name,
      description: data.description,
      region: data.region,
      isArchived: data.isArchived,
      startYear: data.startYear,
      startPopulation: data.startPopulation,
    },
  });
  return nation;
}

export async function POST(request: NationRequest) {
  try {
    const body = await request.json();

    const nation = await createNation(body);

    return NextResponse.json(nation);
  } catch (error) {
    console.error('Error creating nation:', error);
    return NextResponse.json(
      { error: 'Failed to create nation' },
      { status: 500 }
    );
  }
}

export async function fetchNations() {
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
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  }); 

  return nations;
}

export async function GET() {
  try {
    const nations = await fetchNations();

    return NextResponse.json(nations);
  } catch (error) {
    console.error('Error fetching nations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nations' },
      { status: 500 }
    );
  }
} 