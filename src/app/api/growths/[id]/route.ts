import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Growth } from "@prisma/client";

export async function updateGrowth(id: string, data: Partial<Growth>) {
    const growth = await prisma.growth.update({
        where: { id: id },
        data: data,
    });
    return growth;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await updateGrowth(id, await request.json()));
}

export async function getGrowth(id: string) {
    const growth = await prisma.growth.findUnique({
        where: { id: id },
    });
    return growth;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await getGrowth(id));
}