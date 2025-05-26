import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Nation } from '@prisma/client';


export async function getNation(id: string, include: Record<string, any> = {}) {
  const nation = await prisma.nation.findUnique({
    where: { id: id },
    include: include,
  });

  if (!nation) {
    return null;
  }

  return nation;
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const {id} = await params;
    const nation = await getNation(id, {
      growths: {
        include: {
          era: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    });

    if (!nation) {
      return NextResponse.json(
        { error: 'Nation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(nation);
  } catch (error) {
    console.error('Error fetching nation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nation' },
      { status: 500 }
    );
  }
}

//make this accept partial data
export async function updateNation(id: string, data: Partial<Nation>) {
  // Update the nation with new data and vassal relationships
  const nation = await prisma.nation.update({
    where: { id: id },
    data: data
  });

  console.log("PUT /nations/[id] 200")

  return nation;
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const {id} = await params;

    const nation = await updateNation(id, body);

    return NextResponse.json(nation);
  } catch (error) {
    console.error('Error updating nation:', error);
    return NextResponse.json(
      { error: 'Failed to update nation' },
      { status: 500 }
    );
  }
}  