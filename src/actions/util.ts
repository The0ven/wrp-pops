"use server"

export const nationsDiff = async (nationNames: string[]) => {
    const nations = await prisma?.nation.findMany({
        where: {
            name: {
                in: nationNames,
            }
        },
        select: {
            name: true,
        }
    })
    return Array.from(new Set(nationNames).difference(new Set(nations?.map(n=>n.name))))
}
