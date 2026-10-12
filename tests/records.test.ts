import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createTestDatabase } from "./database.mjs";
import { calculatePopulation } from "@/lib/population";
import {
  createNation,
  updateNation,
  saveEmpire,
  createEra,
  updateEra,
  deleteEra,
  createGrowth,
  updateGrowth,
  createAddition,
  updateAddition,
  savePopulationRecords,
} from "@/app/api/_lib/records";
import { importNations } from "@/app/api/_lib/import";

let db: PrismaClient;
beforeAll(() => {
  db = new PrismaClient({
    datasources: {
      db: { url: createTestDatabase(`.test-data/unit-${randomUUID()}.db`) },
    },
  });
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  await db.$transaction([
    db.growth.deleteMany(),
    db.addition.deleteMany(),
    db.nation.deleteMany(),
    db.empire.deleteMany(),
    db.era.deleteMany(),
  ]);
});
async function fixture() {
  const nation = await createNation(
    {
      name: "Test Nation",
      region: "North",
      startYear: 100,
      startPopulation: 1000,
    },
    db,
  );
  const era = await createEra(
    { name: "First", startYear: 100, endYear: 110 },
    db,
  );
  return {
    nation,
    era,
    record: {
      nationId: nation.id,
      eraId: era.id,
      growthRate: 0.01,
      amount: 100,
    },
  };
}
describe("Population math", () => {
  test.each([
    [1000, 100, 0.01, 10, 1215],
    [1000, -100, 0, 10, 900],
    [1000, 100, -1, 0, 0],
    [0, 0, 0.2, 10, 0],
    [1000, 100, 0, 0, 1100],
  ])(
    "calculates %s + %s at %s for %s years",
    (start, addition, rate, years, result) => {
      expect(calculatePopulation(start, addition, rate, years)).toBe(result);
    },
  );
  test.each([
    [1000, -1001, 0, 1],
    [1000, 0, -2, 1],
    [1000, 0, Infinity, 1],
    [1000, 0, 1, 100],
    [1000, 0, 0, -1],
  ])("rejects invalid calculation", (...args) => {
    expect(() =>
      calculatePopulation(...(args as [number, number, number, number])),
    ).toThrow();
  });
});
describe("Population transactions", () => {
  test("creates addition and growth together; repeated saves never double count", async () => {
    const { record } = await fixture();
    const first = (await savePopulationRecords([record], db))[0];
    expect(first).toMatchObject({ startPopulation: 1000, endPopulation: 1215 });
    const second = (await savePopulationRecords([record], db))[0];
    expect(second).toMatchObject({
      id: first.id,
      startPopulation: 1000,
      endPopulation: 1215,
    });
    expect(await db.addition.count()).toBe(1);
  });
  test("updates addition and rate in one save using the new addition", async () => {
    const { record } = await fixture();
    await savePopulationRecords([record], db);
    const [result] = await savePopulationRecords(
      [{ ...record, amount: 500, growthRate: 0.02 }],
      db,
    );
    expect(result.endPopulation).toBe(Math.round(1500 * 1.02 ** 10));
  });
  test("rolls back all rows if a later record fails", async () => {
    const { record } = await fixture();
    await expect(
      savePopulationRecords([record, { ...record, nationId: "missing" }], db),
    ).rejects.toThrow();
    expect(await db.growth.count()).toBe(0);
    expect(await db.addition.count()).toBe(0);
  });
  test("rolls back addition changes when calculation overflows", async () => {
    const { record } = await fixture();
    await savePopulationRecords([record], db);
    await expect(
      savePopulationRecords([{ ...record, amount: 500, growthRate: 100 }], db),
    ).rejects.toThrow();
    expect((await db.addition.findFirstOrThrow()).amount).toBe(100);
    expect((await db.growth.findFirstOrThrow()).endPopulation).toBe(1215);
  });
  test("supports missing additions and notes-only saves", async () => {
    const { record } = await fixture();
    await savePopulationRecords([{ ...record, amount: 0 }], db);
    expect(await db.addition.count()).toBe(0);
    await savePopulationRecords(
      [{ ...record, amount: 0, notes: "No movement" }],
      db,
    );
    expect((await db.addition.findFirstOrThrow()).notes).toBe("No movement");
  });
  test("preserves multiple addition IDs and notes while editing their total", async () => {
    const { record } = await fixture();
    const first = await createAddition(
      { ...record, year: 105, amount: 50, notes: "Earlier" },
      db,
    );
    const second = await createAddition(
      { ...record, year: 110, amount: 100, notes: "Later" },
      db,
    );
    await savePopulationRecords([{ ...record, amount: 200 }], db);
    expect(
      await db.addition.findUnique({ where: { id: first.id } }),
    ).toMatchObject({ amount: 50, notes: "Earlier" });
    expect(
      await db.addition.findUnique({ where: { id: second.id } }),
    ).toMatchObject({ amount: 150, notes: "Later" });
  });
  test("individual addition and growth endpoints also recalculate consistently", async () => {
    const { record } = await fixture();
    const growth = await createGrowth(
      { ...record, startPopulation: 1000, endPopulation: 999 },
      db,
    );
    const addition = await createAddition({ ...record, year: 110 }, db);
    expect(
      (await db.growth.findUniqueOrThrow({ where: { id: growth.id } }))
        .endPopulation,
    ).toBe(1215);
    await updateAddition(addition.id, { amount: 500 }, db);
    const updated = await updateGrowth(
      growth.id,
      { growthRate: 0, endPopulation: 42 },
      db,
    );
    expect(updated).toMatchObject({
      startPopulation: 1000,
      endPopulation: 1500,
    });
  });
  test("uses the most recent earlier record across gaps, preserving zero population", async () => {
    const { record, nation } = await fixture();
    await savePopulationRecords([{ ...record, growthRate: -1 }], db);
    const later = await createEra(
      { name: "Later", startYear: 120, endYear: 130 },
      db,
    );
    const [result] = await savePopulationRecords(
      [{ nationId: nation.id, eraId: later.id, amount: 20, growthRate: 0 }],
      db,
    );
    expect(result).toMatchObject({ startPopulation: 0, endPopulation: 20 });
  });
  test("rejects future nations, duplicates, fractional populations, and invalid rates", async () => {
    const { record, nation } = await fixture();
    await updateNation(nation.id, { startYear: 120 }, db);
    await expect(savePopulationRecords([record], db)).rejects.toThrow(
      /founded/,
    );
    await expect(savePopulationRecords([record, record], db)).rejects.toThrow(
      /twice/,
    );
    await expect(
      savePopulationRecords([{ ...record, amount: 0.5 }], db),
    ).rejects.toThrow();
    await expect(
      savePopulationRecords([{ ...record, growthRate: -1.1 }], db),
    ).rejects.toThrow();
  });
  test("never changes existing later history implicitly", async () => {
    const { record, nation } = await fixture();
    await savePopulationRecords([record], db);
    const era = await createEra(
      { name: "Later", startYear: 110, endYear: 120 },
      db,
    );
    const [later] = await savePopulationRecords(
      [{ ...record, eraId: era.id }],
      db,
    );
    await savePopulationRecords([{ ...record, amount: 500 }], db);
    expect(await db.growth.findUnique({ where: { id: later.id } })).toEqual(
      later,
    );
    expect(
      (await db.nation.findUniqueOrThrow({ where: { id: nation.id } }))
        .startPopulation,
    ).toBe(1000);
  });
});
describe("Nation and empire workflows", () => {
  test("creates nation plus initial population exactly once", async () => {
    const era = await createEra(
      { name: "First", startYear: 0, endYear: 10 },
      db,
    );
    const nation = await createNation(
      {
        name: " New Nation ",
        region: " North ",
        startYear: 0,
        startPopulation: 1000,
        description: "Keep me",
      },
      db,
    );
    expect(nation.name).toBe("New Nation");
    expect(await db.growth.findFirst()).toMatchObject({
      nationId: nation.id,
      eraId: era.id,
      endPopulation: 1000,
    });
    await updateNation(
      nation.id,
      { name: "Renamed", startPopulation: 2000 },
      db,
    );
    expect(await db.growth.count()).toBe(1);
    expect((await db.growth.findFirstOrThrow()).endPopulation).toBe(1000);
  });
  test("nation edits preserve description and empire assignment; archive/unarchive works", async () => {
    const { nation } = await fixture();
    const empire = await saveEmpire(
      undefined,
      { name: "Empire", vassalIds: [nation.id] },
      db,
    );
    await updateNation(
      nation.id,
      { description: "Preserve", isArchived: true },
      db,
    );
    await updateNation(
      nation.id,
      { name: "Renamed", isArchived: false, id: "bad" },
      db,
    );
    expect(
      await db.nation.findUnique({ where: { id: nation.id } }),
    ).toMatchObject({
      name: "Renamed",
      description: "Preserve",
      empireId: empire.id,
      isArchived: false,
    });
  });
  test("name-only empire edit keeps every vassal including archived members", async () => {
    const { nation } = await fixture();
    const empire = await saveEmpire(
      undefined,
      { name: "Empire", vassalIds: [nation.id] },
      db,
    );
    await updateNation(nation.id, { isArchived: true }, db);
    await saveEmpire(empire.id, { name: "Renamed" }, db);
    expect(
      (await db.nation.findUniqueOrThrow({ where: { id: nation.id } }))
        .empireId,
    ).toBe(empire.id);
    await saveEmpire(
      empire.id,
      { name: "Renamed", vassalIds: [nation.id] },
      db,
    );
    expect(
      (await db.nation.findUniqueOrThrow({ where: { id: nation.id } }))
        .empireId,
    ).toBe(empire.id);
  });
  test("replaces selections atomically, including an explicit empty selection", async () => {
    const { nation } = await fixture();
    const empire = await saveEmpire(
      undefined,
      { name: "Empire", vassalIds: [nation.id] },
      db,
    );
    await saveEmpire(empire.id, { vassalIds: [] }, db);
    expect(
      (await db.nation.findUniqueOrThrow({ where: { id: nation.id } }))
        .empireId,
    ).toBeNull();
  });
  test("invalid or reassigned vassals roll back the name and membership", async () => {
    const { nation } = await fixture();
    const empire = await saveEmpire(
      undefined,
      { name: "Empire", vassalIds: [nation.id] },
      db,
    );
    await expect(
      saveEmpire(empire.id, { name: "Bad", vassalIds: ["missing"] }, db),
    ).rejects.toThrow();
    await expect(
      saveEmpire(undefined, { name: "Other", vassalIds: [nation.id] }, db),
    ).rejects.toThrow(/another empire/);
    expect(await db.empire.count()).toBe(1);
    expect(
      await db.empire.findUnique({ where: { id: empire.id } }),
    ).toMatchObject({ name: "Empire" });
    expect(
      (await db.nation.findUniqueOrThrow({ where: { id: nation.id } }))
        .empireId,
    ).toBe(empire.id);
  });
  test("rejects blank names, negative population, and nonexistent empire", async () => {
    await expect(
      createNation(
        { name: " ", region: "North", startYear: 0, startPopulation: 0 },
        db,
      ),
    ).rejects.toThrow();
    await expect(
      createNation(
        { name: "N", region: "North", startYear: 0, startPopulation: -1 },
        db,
      ),
    ).rejects.toThrow();
    await expect(
      createNation(
        {
          name: "N",
          region: "North",
          startYear: 0,
          startPopulation: 0,
          empireId: "missing",
        },
        db,
      ),
    ).rejects.toThrow();
    expect(await db.nation.count()).toBe(0);
  });
});
describe("Era workflows", () => {
  test("validates years and correctly stores years 0–99", async () => {
    await expect(
      createEra({ name: "Bad", startYear: 10, endYear: 0 }, db),
    ).rejects.toThrow();
    const era = await createEra(
      { name: "Early", startYear: 0, endYear: 25 },
      db,
    );
    expect(era.startDate.getUTCFullYear()).toBe(0);
    expect(era.endDate.getUTCFullYear()).toBe(25);
  });
  test("metadata edit preserves history; duration edit recalculates this era", async () => {
    const { era, record } = await fixture();
    const [growth] = await savePopulationRecords([record], db);
    await updateEra(era.id, { name: "Renamed" }, db);
    expect(await db.growth.findUnique({ where: { id: growth.id } })).toEqual(
      growth,
    );
    const updated = await updateEra(era.id, { endYear: 120 }, db);
    expect(updated.endDate.getUTCFullYear()).toBe(120);
    expect(
      (await db.growth.findUniqueOrThrow({ where: { id: growth.id } }))
        .endPopulation,
    ).toBe(Math.round(1100 * 1.01 ** 20));
  });
  test("rejects boundaries excluding existing additions without changing anything", async () => {
    const { era, record } = await fixture();
    await savePopulationRecords([record], db);
    await expect(updateEra(era.id, { endYear: 105 }, db)).rejects.toThrow(
      /outside/,
    );
    expect(await db.era.findUnique({ where: { id: era.id } })).toEqual(era);
  });
  test("deletes only the selected era and its records together", async () => {
    const { era, record, nation } = await fixture();
    await savePopulationRecords([record], db);
    const other = await createEra(
      { name: "Other", startYear: 120, endYear: 130 },
      db,
    );
    await deleteEra(era.id, db);
    expect(await db.growth.count()).toBe(0);
    expect(await db.addition.count()).toBe(0);
    expect(
      await db.nation.findUnique({ where: { id: nation.id } }),
    ).not.toBeNull();
    expect(await db.era.findUnique({ where: { id: other.id } })).not.toBeNull();
  });
});

describe("Atomic import", () => {
  const row = {
    name: "Imported",
    region: "North",
    startYear: 100,
    startPopulation: 1000,
    eras: [
      {
        startYear: 100,
        endYear: 110,
        startPop: 1000,
        endPop: 1215,
        rate: 0.01,
      },
    ],
    additions: [{ year: 110, amount: 100 }],
  };
  test("imports one growth per era, includes additions once, and prevents repeated imports", async () => {
    await importNations([row], db);
    expect(await db.growth.count()).toBe(1);
    expect((await db.growth.findFirstOrThrow()).endPopulation).toBe(1215);
    await expect(importNations([row], db)).rejects.toThrow(/already exists/);
    expect(await db.nation.count()).toBe(1);
  });
  test("bad later row rolls back nations, eras and population records", async () => {
    await expect(
      importNations(
        [row, { ...row, name: "Bad", additions: [{ year: 120, amount: 100 }] }],
        db,
      ),
    ).rejects.toThrow();
    expect(await db.nation.count()).toBe(0);
    expect(await db.era.count()).toBe(0);
    expect(await db.growth.count()).toBe(0);
  });
});
