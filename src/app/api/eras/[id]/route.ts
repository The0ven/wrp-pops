import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Era } from "@prisma/client";

export async function updateEra(id: string, data: Partial<Era>) {
    const era = await prisma.era.update({
        where: { id: id },
        data: data,
    });
    return era;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await updateEra(id, await request.json()));
}

export async function getEra(id: string, include: Record<string, any> = {}) {
    const era = await prisma.era.findUnique({
        where: { id: id },
        include: include,
    });
    return era;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await getEra(id, (await request.json()).include));
}