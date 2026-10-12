"use server";
import { revalidatePath } from "next/cache";
import {
  createNation,
  updateNation,
  saveEmpire,
  savePopulationRecords,
  createEra,
  updateEra,
} from "@/app/api/_lib/records";
import { errorMessage } from "@/app/api/_lib/errors";

export async function handleSubmitNationAction(
  id: string | undefined,
  data: unknown,
) {
  try {
    const nation = id ? await updateNation(id, data) : await createNation(data);
    revalidatePath("/", "layout");
    return { success: true as const, nation };
  } catch (error) {
    return { success: false as const, message: errorMessage(error) };
  }
}
export async function handleSubmitEmpireAction(
  id: string | undefined,
  data: unknown,
) {
  try {
    const empire = await saveEmpire(id, data);
    revalidatePath("/", "layout");
    return { success: true as const, empire };
  } catch (error) {
    return { success: false as const, message: errorMessage(error) };
  }
}
export async function handleSubmitEraAction(
  id: string | undefined,
  data: unknown,
) {
  try {
    const era = id ? await updateEra(id, data) : await createEra(data);
    revalidatePath("/", "layout");
    return { success: true as const, era };
  } catch (error) {
    return { success: false as const, message: errorMessage(error) };
  }
}
export async function submitPopulationRecords(data: unknown) {
  try {
    const records = await savePopulationRecords(data);
    revalidatePath("/", "layout");
    return { success: true as const, records };
  } catch (error) {
    return { success: false as const, message: errorMessage(error) };
  }
}
