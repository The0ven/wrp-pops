"use server"

import { updateNation } from "@/app/api/nations/[id]/route";
import { prisma } from "@/lib/prisma";

export const nationsDiff = async (nationNames: string[]) => {
    /*
     * Returns two arrays
     * the 1st is the nations NOT CREATED that DO appear in the input list (To Archive)
     * the 2nd is the nations CREATED that DO NOT appear in the input list (To Create)
     */
    const nations = await prisma?.nation.findMany({
        select: {
            name: true,
            isArchived: false
        }
    })
    
    const inputList = nationNames.map(n => n.trim().toLowerCase());
    const existingList = nations?.map(n => n.name.trim().toLowerCase()) || [];

    // Helper to check if a name is present as a substring in any of the other list
    const isNameInList = (name: string, list: string[]) => {
        return list.some(other => other.includes(name) || name.includes(other));
    };

    // To Archive: names in inputList that are not present in existingList (by substring match)
    const toArchive = inputList.filter(
        name => !isNameInList(name, existingList)
    );
    // To Create: names in existingList that are not present in inputList (by substring match)
    const toCreate = existingList.filter(
        name => !isNameInList(name, inputList)
    );

    return [toArchive, toCreate];
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
        return {
            success: false,
            message: "Nation already archive or does not exist"
        }
    }

    await updateNation(nation.id, {
        isArchived: true
    })

    return {
        success: true,
        message: "Nation archived"
    }
}

export const fetchGrowthAndAddition = async (eraId: string, nationId: string) => {
  const growth = await prisma.growth.findFirst({
    where: { eraId, nationId },
    include: { nation: true, era: true },
  });
  const addition = await prisma.addition.findFirst({
    where: { eraId, nationId },
    include: { nation: true, era: true },
  });
  return { growth, addition };
};

export const fetchNation = async (nationId: string) => {
  return await prisma.nation.findUnique({
    where: { id: nationId },
  });
};
