import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculatePopulation, startingPopulation } from "@/lib/population";
import {
  empireSchema,
  eraFields,
  eraSchema,
  integer,
  nationSchema,
  population,
  rate,
  recordSchema,
  year,
} from "@/lib/validation";
import { RequestError } from "./errors";

type Transaction = Prisma.TransactionClient;
const pair = z.object({
  nationId: z.string().min(1),
  eraId: z.string().min(1),
});
const growthFields = z.object({
  startPopulation: population,
  growthRate: rate,
  notes: z.string().nullable().optional(),
});
const additionFields = z.object({
  amount: integer,
  year,
  notes: z.string().nullable().optional(),
});

async function context(tx: Transaction, nationId: string, eraId: string) {
  const nation = await tx.nation.findUnique({ where: { id: nationId } });
  const era = await tx.era.findUnique({
    where: { id: eraId },
    include: {
      growths: { where: { nationId } },
      additions: {
        where: { nationId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
  if (!nation || !era) throw new RequestError("Nation or era not found", 404);
  if (era.growths.length > 1)
    throw new RequestError(
      "This nation has multiple growth records in this era. Resolve the duplicates before editing.",
      409,
    );
  return { nation, era };
}

async function recalculate(tx: Transaction, nationId: string, eraId: string) {
  const { era } = await context(tx, nationId, eraId);
  const growth = era.growths[0];
  if (!growth) return;
  const total = era.additions.reduce((sum, a) => sum + a.amount, 0);
  const endPopulation = calculatePopulation(
    growth.startPopulation,
    total,
    growth.growthRate,
    era.endYear - era.startYear,
  );
  return tx.growth.update({
    where: { id: growth.id },
    data: { endPopulation },
  });
}

/** Every entry in one Save is committed together; additions are read after their update. */
export async function savePopulationRecords(
  input: unknown,
  db: PrismaClient = prisma,
) {
  const records = z.array(recordSchema).min(1).max(1000).parse(input);
  const keys = records.map((r) => `${r.nationId}/${r.eraId}`);
  if (new Set(keys).size !== keys.length)
    throw new RequestError("The same population record was submitted twice");
  return db.$transaction(
    async (tx) => {
      const results = [];
      for (const record of records) {
        const { nation, era } = await context(
          tx,
          record.nationId,
          record.eraId,
        );
        if (nation.startYear > era.endYear)
          throw new RequestError(
            "This nation was founded after the selected era",
          );
        let startPopulation =
          record.startPopulation ?? era.growths[0]?.startPopulation;
        if (startPopulation === undefined) {
          const eras = await tx.era.findMany({
            include: {
              growths: { where: { nationId: nation.id } },
              additions: { where: { nationId: nation.id } },
            },
          });
          startPopulation = startingPopulation(nation, era, eras);
        }
        // The editor shows the total. Keep all existing addition IDs, dates, and notes.
        const addition = era.additions.at(-1);
        const total = era.additions.reduce((sum, a) => sum + a.amount, 0);
        if (addition) {
          const amount = integer.parse(addition.amount + record.amount - total);
          await tx.addition.update({
            where: { id: addition.id },
            data: {
              amount,
              ...(record.notes !== undefined && { notes: record.notes }),
            },
          });
        } else if (record.amount !== 0 || record.notes) {
          await tx.addition.create({
            data: {
              nationId: nation.id,
              eraId: era.id,
              year: era.endYear,
              amount: record.amount,
              notes: record.notes,
            },
          });
        }
        const endPopulation = calculatePopulation(
          startPopulation,
          record.amount,
          record.growthRate,
          era.endYear - era.startYear,
        );
        const data = {
          startPopulation,
          growthRate: record.growthRate,
          endPopulation,
        };
        results.push(
          era.growths[0]
            ? await tx.growth.update({ where: { id: era.growths[0].id }, data })
            : await tx.growth.create({
                data: { ...data, nationId: nation.id, eraId: era.id },
              }),
        );
      }
      return results;
    },
    { timeout: 30000 },
  );
}

export async function createGrowth(input: unknown, db: PrismaClient = prisma) {
  const data = pair.merge(growthFields).parse(input);
  return db.$transaction(async (tx) => {
    const { nation, era } = await context(tx, data.nationId, data.eraId);
    if (nation.startYear > era.endYear)
      throw new RequestError("This nation was founded after the selected era");
    if (era.growths.length)
      throw new RequestError(
        "A growth record already exists for this nation and era",
        409,
      );
    const amount = era.additions.reduce((sum, a) => sum + a.amount, 0);
    return tx.growth.create({
      data: {
        ...data,
        endPopulation: calculatePopulation(
          data.startPopulation,
          amount,
          data.growthRate,
          era.endYear - era.startYear,
        ),
      },
    });
  });
}

export async function updateGrowth(
  id: string,
  input: unknown,
  db: PrismaClient = prisma,
) {
  const data = growthFields.partial().parse(input);
  return db.$transaction(async (tx) => {
    const growth = await tx.growth.update({ where: { id }, data });
    return recalculate(tx, growth.nationId, growth.eraId);
  });
}

export async function createAddition(
  input: unknown,
  db: PrismaClient = prisma,
) {
  const data = pair.merge(additionFields).parse(input);
  return db.$transaction(async (tx) => {
    const { era } = await context(tx, data.nationId, data.eraId);
    if (data.year < era.startYear || data.year > era.endYear)
      throw new RequestError("Addition year must fall within the era");
    const addition = await tx.addition.create({ data });
    await recalculate(tx, data.nationId, data.eraId);
    return addition;
  });
}

export async function updateAddition(
  id: string,
  input: unknown,
  db: PrismaClient = prisma,
) {
  const data = additionFields.partial().parse(input);
  return db.$transaction(async (tx) => {
    const existing = await tx.addition.findUniqueOrThrow({
      where: { id },
      include: { era: true },
    });
    if (
      data.year !== undefined &&
      (data.year < existing.era.startYear || data.year > existing.era.endYear)
    )
      throw new RequestError("Addition year must fall within the era");
    const addition = await tx.addition.update({ where: { id }, data });
    await recalculate(tx, addition.nationId, addition.eraId);
    return addition;
  });
}

/** Creates a nation and its initial growth record inside an existing transaction. */
export async function insertNation(
  tx: Transaction,
  data: z.infer<typeof nationSchema>,
) {
  const nation = await tx.nation.create({ data });
  const era = await tx.era.findFirst({
    where: { endYear: { gte: nation.startYear } },
    orderBy: [{ endYear: "asc" }, { startYear: "asc" }],
  });
  if (era)
    await tx.growth.create({
      data: {
        nationId: nation.id,
        eraId: era.id,
        startPopulation: nation.startPopulation,
        endPopulation: nation.startPopulation,
        growthRate: 0,
      },
    });
  return nation;
}

export async function createNation(input: unknown, db: PrismaClient = prisma) {
  const data = nationSchema.parse(input);
  return db.$transaction((tx) => insertNation(tx, data));
}

export async function updateNation(
  id: string,
  input: unknown,
  db: PrismaClient = prisma,
) {
  // Metadata edits must not rewrite historical population records or omitted fields.
  return db.nation.update({
    where: { id },
    data: nationSchema.partial().parse(input),
  });
}

export async function saveEmpire(
  id: string | undefined,
  input: unknown,
  db: PrismaClient = prisma,
) {
  const { vassalIds, ...data } = (
    id ? empireSchema.partial() : empireSchema
  ).parse(input);
  return db.$transaction(async (tx) => {
    const empire = id
      ? await tx.empire.update({ where: { id }, data })
      : await tx.empire.create({ data: { name: data.name! } });
    if (vassalIds !== undefined) {
      const ids = [...new Set(vassalIds)];
      const nations = await tx.nation.findMany({ where: { id: { in: ids } } });
      if (nations.length !== ids.length)
        throw new RequestError("A selected nation no longer exists", 409);
      if (nations.some((n) => n.empireId !== null && n.empireId !== empire.id))
        throw new RequestError(
          "A selected nation now belongs to another empire. Reload before saving.",
          409,
        );
      if (nations.some((n) => n.isArchived && n.empireId !== empire.id))
        throw new RequestError(
          "Archived nations cannot be assigned as new vassals",
        );
      await tx.nation.updateMany({
        where: { empireId: empire.id, id: { notIn: ids } },
        data: { empireId: null },
      });
      await tx.nation.updateMany({
        where: { id: { in: ids } },
        data: { empireId: empire.id },
      });
    }
    return empire;
  });
}

function dates(startYear: number, endYear: number) {
  const startDate = new Date(0);
  startDate.setUTCFullYear(startYear, 0, 1);
  const endDate = new Date(0);
  endDate.setUTCFullYear(endYear, 11, 31);
  return { startDate, endDate };
}
export async function createEra(input: unknown, db: PrismaClient = prisma) {
  const data = eraSchema.parse(input);
  return db.era.create({
    data: { ...data, ...dates(data.startYear, data.endYear) },
  });
}
export async function updateEra(
  id: string,
  input: unknown,
  db: PrismaClient = prisma,
) {
  const patch = eraFields.partial().parse(input);
  return db.$transaction(
    async (tx) => {
      const old = await tx.era.findUniqueOrThrow({ where: { id } });
      const data = eraSchema.parse({ ...old, ...patch });
      const boundariesChanged =
        old.startYear !== data.startYear || old.endYear !== data.endYear;
      if (boundariesChanged) {
        const outside = await tx.addition.count({
          where: {
            eraId: id,
            OR: [
              { year: { lt: data.startYear } },
              { year: { gt: data.endYear } },
            ],
          },
        });
        if (outside)
          throw new RequestError(
            "These years would place existing additions outside the era",
          );
        const futureNations = await tx.growth.count({
          where: { eraId: id, nation: { startYear: { gt: data.endYear } } },
        });
        if (futureNations)
          throw new RequestError(
            "These years would place a recorded nation before its founding",
          );
      }
      const era = await tx.era.update({
        where: { id },
        data: { ...data, ...dates(data.startYear, data.endYear) },
      });
      if (boundariesChanged) {
        const growths = await tx.growth.findMany({ where: { eraId: id } });
        for (const growth of growths)
          await recalculate(tx, growth.nationId, id);
      }
      return era;
    },
    { timeout: 30000 },
  );
}
export async function deleteEra(id: string, db: PrismaClient = prisma) {
  return db.$transaction(async (tx) => {
    await tx.growth.deleteMany({ where: { eraId: id } });
    await tx.addition.deleteMany({ where: { eraId: id } });
    return tx.era.delete({ where: { id } });
  });
}
