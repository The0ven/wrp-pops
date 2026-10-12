import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  integer,
  nationSchema,
  population,
  rate,
  year,
} from "@/lib/validation";
import { calculatePopulation } from "@/lib/population";
import { RequestError } from "./errors";

const importSchema = z
  .array(
    nationSchema.extend({
      eras: z
        .array(
          z.object({
            startYear: year,
            endYear: year,
            startPop: population,
            endPop: population,
            rate,
          }),
        )
        .min(1),
      additions: z.array(z.object({ year, amount: integer })),
    }),
  )
  .min(1)
  .max(1000);

/** Import is a single transaction: a malformed later row cannot leave a partial import. */
export async function importNations(input: unknown, db: PrismaClient = prisma) {
  const nations = importSchema.parse(input);
  const names = nations.map((n) => n.name.toLowerCase());
  if (new Set(names).size !== names.length)
    throw new RequestError("The import contains duplicate nation names");
  return db.$transaction(
    async (tx) => {
      const existingNames = new Set(
        (await tx.nation.findMany({ select: { name: true } })).map((n) =>
          n.name.toLowerCase(),
        ),
      );
      if (names.some((n) => existingNames.has(n)))
        throw new RequestError(
          "An imported nation already exists. Edit the existing nation instead of importing it again.",
          409,
        );
      const years = [
        ...new Set(nations.flatMap((n) => n.eras.map((e) => e.endYear))),
      ].sort((a, b) => a - b);
      const firstYear = Math.min(...nations.map((n) => n.startYear));
      const eras = new Map<
        number,
        { id: string; startYear: number; endYear: number }
      >();
      for (const [index, endYear] of years.entries()) {
        const startYear = index ? years[index - 1] : firstYear;
        if (endYear < startYear)
          throw new RequestError("Imported era ends before it starts");
        let era = await tx.era.findFirst({ where: { startYear, endYear } });
        if (!era) {
          const startDate = new Date(0);
          startDate.setUTCFullYear(startYear, 0, 1);
          const endDate = new Date(0);
          endDate.setUTCFullYear(endYear, 11, 31);
          era = await tx.era.create({
            data: {
              name: `Era ${startYear}-${endYear}`,
              startYear,
              endYear,
              startDate,
              endDate,
            },
          });
        }
        eras.set(endYear, era);
      }
      for (const { eras: records, additions, ...data } of nations) {
        const nation = await tx.nation.create({ data });
        const recordYears = new Set(records.map((r) => r.endYear));
        if (recordYears.size !== records.length)
          throw new RequestError("A nation has duplicate era records");
        for (const addition of additions) {
          const era = eras.get(addition.year);
          if (!era || !recordYears.has(addition.year))
            throw new RequestError(
              "An addition has no matching population record",
            );
          await tx.addition.create({
            data: { ...addition, nationId: nation.id, eraId: era.id },
          });
        }
        for (const record of records) {
          const era = eras.get(record.endYear)!;
          if (nation.startYear > era.endYear)
            throw new RequestError(
              "A population record precedes the nation's founding",
            );
          const amount = additions
            .filter((a) => a.year === era.endYear)
            .reduce((sum, a) => sum + a.amount, 0);
          await tx.growth.create({
            data: {
              nationId: nation.id,
              eraId: era.id,
              startPopulation: record.startPop,
              growthRate: record.rate,
              endPopulation: calculatePopulation(
                record.startPop,
                amount,
                record.rate,
                era.endYear - era.startYear,
              ),
            },
          });
        }
      }
      return { imported: nations.length };
    },
    { timeout: 60000 },
  );
}
