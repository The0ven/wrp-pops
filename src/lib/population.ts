import type { Addition, Era, Growth, Nation } from "@prisma/client";
import { population, rate } from "./validation";

export type EraRecords = Era & { growths: Growth[]; additions: Addition[] };

/** Stored startPopulation excludes additions. Rates are fractions: 0.01 = 1%. */
export function calculatePopulation(
  start: number,
  additions: number,
  growthRate: number,
  years: number,
) {
  population.parse(start);
  rate.parse(growthRate);
  if (!Number.isInteger(additions) || !Number.isInteger(years) || years < 0)
    throw new RangeError("Invalid population calculation");
  const base = start + additions;
  if (base < 0)
    throw new RangeError(
      "Additions cannot reduce the starting population below zero",
    );
  const result =
    growthRate === -1 ? 0 : Math.round(base * Math.pow(1 + growthRate, years));
  if (!population.safeParse(result).success)
    throw new RangeError("Calculated population exceeds the supported range");
  return result;
}

export function startingPopulation(
  nation: Pick<Nation, "id" | "startYear" | "startPopulation">,
  era: EraRecords,
  eras: EraRecords[],
) {
  const existing = era.growths.find((g) => g.nationId === nation.id);
  if (existing) return existing.startPopulation;
  const previous = [...eras]
    .filter((e) => e.id !== era.id && e.endYear <= era.startYear)
    .sort((a, b) => b.endYear - a.endYear || b.startYear - a.startYear)
    .flatMap((e) => e.growths.filter((g) => g.nationId === nation.id))[0];
  if (previous) return previous.endPopulation;
  // Older nation creation recorded founding population as an addition.
  const foundingAddition = era.additions.some(
    (a) =>
      a.nationId === nation.id &&
      a.year === nation.startYear &&
      a.amount === nation.startPopulation,
  );
  return foundingAddition ? 0 : nation.startPopulation;
}
