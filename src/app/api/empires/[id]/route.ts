import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Empire } from "@prisma/client";

export async function updateEmpire(id: string, data: Partial<Empire>) {
    const empire = await prisma.empire.update({
        where: { id: id },
        data: data,
    });
    return empire;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await updateEmpire(id, await request.json()));
}

export async function getEmpire(id: string, include: Record<string, any> = {}) {
    const empire = await prisma.empire.findUnique({
        where: { id: id },
        include: include,
    });
    return empire;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await getEmpire(id, (await request.json()).include));
} 