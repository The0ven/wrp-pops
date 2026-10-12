import { z } from "zod";

// Prisma Int is signed 32-bit, even when SQLite itself accepts larger integers.
export const integer = z.number().int().min(-2147483648).max(2147483647);
export const population = integer.min(0);
export const year = integer.min(-9999).max(9999);
export const rate = z
  .number()
  .finite()
  .min(-1, "Growth rate must be at least -1");
const name = z.string().trim().min(1, "Name is required").max(100);
export const nationSchema = z.object({
  name,
  region: z.string().trim().min(1, "Region is required").max(100),
  description: z.string().nullable().optional(),
  startYear: year,
  startPopulation: population,
  isArchived: z.boolean().optional(),
  empireId: z.string().min(1).nullable().optional(),
});
export const empireSchema = z.object({
  name,
  vassalIds: z.array(z.string().min(1)).optional(),
});
export const eraFields = z.object({
  name,
  startYear: year,
  endYear: year,
  description: z.string().nullable().optional(),
});
export const eraSchema = eraFields.refine((d) => d.endYear >= d.startYear, {
  message: "End year must be on or after start year",
  path: ["endYear"],
});
export const recordSchema = z.object({
  nationId: z.string().min(1),
  eraId: z.string().min(1),
  startPopulation: population.optional(),
  growthRate: rate,
  amount: integer,
  notes: z.string().nullable().optional(),
});
export type RecordInput = z.infer<typeof recordSchema>;
