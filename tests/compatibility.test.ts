import { test, expect } from "vitest";
import { DatabaseSync, backup } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  savePopulationRecords,
  saveEmpire,
  updateNation,
} from "@/app/api/_lib/records";

test.skipIf(!existsSync("prisma/dev.db"))(
  "existing database remains unchanged while edits work on a disposable backup",
  async () => {
    const checksum = () =>
      createHash("sha256").update(readFileSync("prisma/dev.db")).digest("hex");
    const before = checksum();
    mkdirSync(".test-data", { recursive: true });
    const path = resolve(`.test-data/compatibility-${randomUUID()}.db`);
    const source = new DatabaseSync("prisma/dev.db", { readOnly: true });
    try {
      expect(source.prepare("PRAGMA integrity_check").get()).toMatchObject({
        integrity_check: "ok",
      });
      await backup(source, path);
    } finally {
      source.close();
    }
    const db = new PrismaClient({
      datasources: { db: { url: `file:${path.replaceAll("\\", "/")}` } },
    });
    try {
      const nations = await db.nation.findMany({ orderBy: { id: "asc" } });
      const empires = await db.empire.findMany({ include: { vassals: true } });
      const growths = await db.growth.findMany({ orderBy: { id: "asc" } });
      const additions = await db.addition.findMany({ orderBy: { id: "asc" } });
      if (nations[0]) {
        const nation = nations[0];
        const updated = await updateNation(
          nation.id,
          { name: `${nation.name.slice(0, 80)} test` },
          db,
        );
        expect(updated.empireId).toBe(nation.empireId);
        expect(updated.description).toBe(nation.description);
        expect(await db.growth.findMany({ orderBy: { id: "asc" } })).toEqual(
          growths,
        );
        expect(await db.addition.findMany({ orderBy: { id: "asc" } })).toEqual(
          additions,
        );
      }
      if (empires[0]) {
        const empire = empires[0];
        await saveEmpire(
          empire.id,
          { name: empire.name, vassalIds: empire.vassals.map((n) => n.id) },
          db,
        );
        expect(
          (await db.nation.findMany({ where: { empireId: empire.id } }))
            .map((n) => n.id)
            .sort(),
        ).toEqual(empire.vassals.map((n) => n.id).sort());
      }
      const latest = await db.growth.findFirst({
        orderBy: { era: { endYear: "desc" } },
        include: { era: true, nation: true },
      });
      if (latest && latest.nation.startYear <= latest.era.endYear) {
        const existing = additions.filter(
          (a) => a.nationId === latest.nationId && a.eraId === latest.eraId,
        );
        const total = existing.reduce((sum, a) => sum + a.amount, 0);
        // Use a bounded rate on the copy; this is never a historical rewrite of the source.
        if (
          latest.startPopulation + total >= 0 &&
          latest.startPopulation + total <= 2147483547
        ) {
          const [saved] = await savePopulationRecords(
            [
              {
                nationId: latest.nationId,
                eraId: latest.eraId,
                growthRate: 0,
                amount: total + 100,
              },
            ],
            db,
          );
          expect(saved.endPopulation).toBe(
            latest.startPopulation + total + 100,
          );
          expect(await db.growth.count()).toBe(growths.length);
          expect(
            await db.growth.findMany({
              where: { id: { not: latest.id } },
              orderBy: { id: "asc" },
            }),
          ).toEqual(growths.filter((g) => g.id !== latest.id));
        }
      }
    } finally {
      await db.$disconnect();
      expect(checksum()).toBe(before);
    }
  },
);
