import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { Addition } from "@prisma/client";

export async function updateAddition(id: string, data: Partial<Addition>) {
    const addition = await prisma.addition.update({
        where: { id: id },
        data: data,
    });
    return addition;
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await updateAddition(id, await request.json()));
}

export async function getAddition(id: string) {
    const addition = await prisma.addition.findUnique({
        where: { id: id },
    });
    return addition;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    return NextResponse.json(await getAddition(id));
}