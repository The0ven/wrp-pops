"use server"

import { createAddition } from "@/app/api/additions/route";
import { getEras } from "@/app/api/eras/route";
import { createGrowth } from "@/app/api/growths/route";
import { updateNation } from "@/app/api/nations/[id]/route";
import { createNation } from "@/app/api/nations/route";
import { createEmpire } from "@/app/api/empires/route";
import { updateEmpire } from "@/app/api/empires/[id]/route";
import { Nation, Empire } from "@prisma/client";
import { updateGrowth } from "@/app/api/growths/[id]/route";
import { updateAddition } from "@/app/api/additions/[id]/route";

export const handleSubmitNationAction = async (id: string | undefined, data: Omit<Nation, "id" | "createdAt" | "updatedAt">) => {
    console.log("STARTING SUBMIT")
    try {
      if (id) {
        const updated = await updateNation(id, data)
        return {
          success: true,
          message: "Nation updated",
          nation: updated 
        }
      } else {
        const created = await createNation(data)
        return {
          success: true,
          message: "Nation created",
          nation: created
        }
      }
    } catch (error) {
      console.error('Error updating nation:', error);
      return {
        success: false,
        message: "Error updating nation"
      }
    }
};

export const handleSubmitEmpireAction = async (id: string | undefined, data: Omit<Empire, "id" | "createdAt" | "updatedAt">) => {
    console.log("STARTING EMPIRE SUBMIT")
    try {
      if (id) {
        const updated = await updateEmpire(id, data)
        return {
          success: true,
          message: "Empire updated",
          empire: updated 
        }
      } else {
        const created = await createEmpire(data)
        return {
          success: true,
          message: "Empire created",
          empire: created
        }
      }
    } catch (error) {
      console.error('Error updating empire:', error);
      return {
        success: false,
        message: "Error updating empire"
      }
    }
};

export const handleSubmitNationEras = async (
  nationId: string,
  startYear: number,
  startPopulation: number,
  notes: string = 'Auto-added on nation creation or edit'
) => {
  // Fetch all eras
  const eras = await getEras();
  // Find the era whose endYear is the soonest after the nation's startYear
  const matchingEra = eras
    .filter((era: any) => era.endYear >= startYear)
    .sort((a: any, b: any) => a.endYear - b.endYear)[0];
  if (matchingEra) {
    // Check if this nation is already in the additions for this era
    const alreadyAdded = matchingEra.additions?.some((add: any) => add.nationId === nationId);
    if (!alreadyAdded) {
      // Create an addition for this nation in this era
      await createAddition({
        nationId: nationId,
        eraId: matchingEra.id,
        year: startYear,
        amount: startPopulation,
        notes,
      });
    }
    // Check if this nation already has a growth for this era
    const alreadyGrowth = matchingEra.growths?.some((growth: any) => growth.nationId === nationId);
    if (!alreadyGrowth) {
      // Create a growth for this nation in this era with growthRate 0
      await createGrowth({
        nationId: nationId,
        eraId: matchingEra.id,
        startPopulation: 0,
        endPopulation: startPopulation,
        growthRate: 0,
        notes,
      });
    } 
  }
};

export const submitGrowthAndAddition = async (
  growthId: string,
  additionId: string,
  data: {
    startPopulation: number;
    growthRate: number;
    endPopulation: number;
    amount: number;
    note?: string;
  }
) => {
  try {
    await updateGrowth(growthId, {
      startPopulation: data.startPopulation,
      growthRate: data.growthRate,
      endPopulation: data.endPopulation,
    });
    await updateAddition(additionId, {
      amount: data.amount,
      notes: data.note,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
};
