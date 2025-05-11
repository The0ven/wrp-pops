"use server"

export const nationsDiff = async (nationNames: string[]) => {
    /*
     * Returns two arrays
     * the 1st is the nations NOT CREATED that DO appear in the input list
     * the 2nd is the nations CREATED that DO NOT appear in the input list
     */
    const nations = await prisma?.nation.findMany({
        select: {
            name: true,
        }
    })
    const list = new Set(nationNames);
    const existing = new Set(nations?.map(n=>n.name));
    return [Array.from(list.difference(existing)), Array.from(existing.difference(list))]
}

export const archiveNationByName = async (nationName: string) => {
    const nation = await prisma?.nation.findFirst({
        where: {
            name: nationName
        },
        select: {
            id: true,
            isArchived: true
        }
    })

    if (nation?.isArchived || !nation?.id) {
        return
    }

    prisma?.nation.update({
        where: {
            id: nation.id
        },
        data: {
            isArchived: true
        }
    })
}
