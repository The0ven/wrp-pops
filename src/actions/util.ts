"use server";
import { revalidatePath } from "next/cache";
import { updateNation, deleteEra as removeEra } from "@/app/api/_lib/records";
import { errorMessage } from "@/app/api/_lib/errors";
import { prisma } from "@/lib/prisma";

export async function nationsDiff(nationNames: string[]) {
  const nations = await prisma.nation.findMany({
    where: { isArchived: false },
    select: { name: true },
  });
  const input = [
    ...new Set(nationNames.map((name) => name.trim()).filter(Boolean)),
  ];
  const existing = new Set(nations.map((n) => n.name.toLowerCase()));
  const supplied = new Set(input.map((name) => name.toLowerCase()));
  return [
    input.filter((name) => !existing.has(name.toLowerCase())),
    nations
      .filter((n) => !supplied.has(n.name.toLowerCase()))
      .map((n) => n.name),
  ];
}
export async function archiveNation(id: string) {
  try {
    await updateNation(id, { isArchived: true });
    revalidatePath("/", "layout");
    return { success: true, message: "Nation archived" };
  } catch (error) {
    return { success: false, message: errorMessage(error) };
  }
}
export async function archiveNationByName(name: string) {
  const nations = await prisma.nation.findMany({
    where: { name, isArchived: false },
    select: { id: true },
  });
  if (nations.length !== 1)
    return {
      success: false,
      message:
        "Find the nation by its detail page; this name is missing or ambiguous.",
    };
  return archiveNation(nations[0].id);
}
export async function deleteEra(id: string) {
  try {
    await removeEra(id);
    revalidatePath("/", "layout");
    return { success: true, message: "Era deleted successfully" };
  } catch (error) {
    return { success: false, message: errorMessage(error) };
  }
}
