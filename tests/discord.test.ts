import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { PrismaClient } from "@prisma/client";
import { DatabaseSync, backup } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createTestDatabase } from "./database.mjs";
import { createEra, createNation } from "@/app/api/_lib/records";
import {
  createRegistration,
  linkNation,
  memberLinks,
  regions,
  releaseMember,
  searchNations,
} from "@/app/api/_lib/discord";
import { POST as registrationRoute } from "@/app/api/integrations/discord/registrations/route";
import { GET as regionsRoute } from "@/app/api/integrations/discord/regions/route";

let db: PrismaClient;
beforeAll(() => {
  db = new PrismaClient({
    datasources: {
      db: { url: createTestDatabase(`.test-data/discord-${randomUUID()}.db`) },
    },
  });
});
afterAll(async () => {
  await db.$disconnect();
});
beforeEach(async () => {
  await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS "fail_link"');
  await db.$transaction([
    db.discordRegistration.deleteMany(),
    db.growth.deleteMany(),
    db.addition.deleteMany(),
    db.nation.deleteMany(),
    db.era.deleteMany(),
  ]);
  await createEra(
    { name: "Era 1", startYear: 1000, endYear: 1100 },
    db,
  );
});

const guildId = "500000000000000001";
const memberId = "600000000000000001";
const payload = (overrides: Record<string, unknown> = {}) => ({
  applicationId: "app-1",
  guildId,
  memberId,
  threadId: "700000000000000001",
  registrationUrl: "https://discord.com/channels/1/2",
  name: "Avalon",
  officialName: "Kingdom of Avalon",
  region: "North",
  startPopulation: 125000,
  startYear: 1010,
  ...overrides,
});

describe("route authentication", () => {
  const original = process.env.DISCORD_INTEGRATION_TOKEN;
  afterEach(() => {
    if (original === undefined) delete process.env.DISCORD_INTEGRATION_TOKEN;
    else process.env.DISCORD_INTEGRATION_TOKEN = original;
  });
  const call = (headers: Record<string, string>) =>
    registrationRoute(
      new Request("http://local/api/integrations/discord/registrations", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ applicationId: "x" }),
      }),
    );

  test("is disabled until a token is configured", async () => {
    delete process.env.DISCORD_INTEGRATION_TOKEN;
    expect((await call({ authorization: "Bearer anything" })).status).toBe(503);
  });
  test("rejects missing and wrong tokens", async () => {
    process.env.DISCORD_INTEGRATION_TOKEN = "secret-token";
    expect((await call({})).status).toBe(401);
    expect((await call({ authorization: "Bearer wrong" })).status).toBe(401);
    expect((await call({ authorization: "secret-token" })).status).toBe(401);
    const res = await regionsRoute(
      new Request("http://local/api/integrations/discord/regions"),
    );
    expect(res.status).toBe(401);
  });
  test("validates the body once authorized", async () => {
    process.env.DISCORD_INTEGRATION_TOKEN = "secret-token";
    const res = await call({ authorization: "Bearer secret-token" });
    expect(res.status).toBe(400);
  });
});

describe("registrations", () => {
  test("creates the nation, initial growth, and link together", async () => {
    const result = await createRegistration(payload(), db);
    expect(result.created).toBe(true);
    expect(result.nationPath).toBe(`/nations/${result.nation.id}`);
    const nation = await db.nation.findUniqueOrThrow({
      where: { id: result.nation.id },
    });
    expect(nation).toMatchObject({
      name: "Avalon",
      region: "North",
      startPopulation: 125000,
      startYear: 1010,
    });
    expect(nation.description).toContain("Official name: Kingdom of Avalon");
    expect(nation.description).toContain("https://discord.com/channels/1/2");
    const growths = await db.growth.findMany({ where: { nationId: nation.id } });
    expect(growths).toHaveLength(1);
    expect(growths[0]).toMatchObject({
      startPopulation: 125000,
      endPopulation: 125000,
      growthRate: 0,
    });
  });

  test("identical replays return the original without duplicates", async () => {
    const first = await createRegistration(payload(), db);
    const replays = await Promise.all([
      createRegistration(payload(), db),
      createRegistration(payload({ threadId: null }), db),
    ]);
    for (const replay of replays) {
      expect(replay.created).toBe(false);
      expect(replay.nation.id).toBe(first.nation.id);
    }
    expect(await db.nation.count()).toBe(1);
    expect(await db.growth.count()).toBe(1);
    expect(await db.discordRegistration.count()).toBe(1);
  });

  test("concurrent first attempts create a single nation", async () => {
    const results = await Promise.allSettled([
      createRegistration(payload(), db),
      createRegistration(payload(), db),
    ]);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await db.nation.count()).toBe(1);
    expect(await db.growth.count()).toBe(1);
  });

  test("conflicting replays are rejected", async () => {
    await createRegistration(payload(), db);
    await expect(
      createRegistration(payload({ startPopulation: 1 }), db),
    ).rejects.toMatchObject({ status: 409 });
    expect(await db.nation.count()).toBe(1);
  });

  test("existing names require explicit linking", async () => {
    await createNation(
      { name: "avalon", region: "South", startYear: 1000, startPopulation: 5 },
      db,
    );
    await expect(createRegistration(payload(), db)).rejects.toMatchObject({
      status: 409,
    });
    expect(await db.nation.count()).toBe(1);
    expect(await db.growth.count()).toBe(1);
  });

  test("members with an active link cannot register again", async () => {
    await createRegistration(payload(), db);
    await expect(
      createRegistration(payload({ applicationId: "app-2", name: "B" }), db),
    ).rejects.toMatchObject({ status: 409 });
  });

  test("validation rejects out-of-range values", async () => {
    await expect(
      createRegistration(payload({ startPopulation: -1 }), db),
    ).rejects.toThrow();
    await expect(
      createRegistration(payload({ startYear: 10000 }), db),
    ).rejects.toThrow();
    await expect(
      createRegistration(payload({ memberId: "abc" }), db),
    ).rejects.toThrow();
    expect(await db.nation.count()).toBe(0);
  });

  test("a failed link insert rolls back the nation and growth", async () => {
    await db.$executeRawUnsafe(
      `CREATE TRIGGER "fail_link" BEFORE INSERT ON "DiscordRegistration"
       BEGIN SELECT RAISE(ABORT, 'forced failure'); END`,
    );
    await expect(createRegistration(payload(), db)).rejects.toThrow();
    expect(await db.nation.count()).toBe(0);
    expect(await db.growth.count()).toBe(0);
  });
});

describe("legacy links and release", () => {
  async function legacy(archived = false) {
    const nation = await createNation(
      {
        name: "Old Realm",
        region: "West",
        startYear: 1000,
        startPopulation: 900,
        isArchived: archived,
      },
      db,
    );
    await db.addition.create({
      data: {
        nationId: nation.id,
        eraId: (await db.era.findFirstOrThrow()).id,
        amount: 50,
        year: 1020,
      },
    });
    return nation;
  }
  const link = (nationId: string, overrides = {}) => ({
    applicationId: "legacy-1",
    guildId,
    memberId,
    nationId,
    ...overrides,
  });

  test("linking preserves existing population history", async () => {
    const nation = await legacy();
    const before = {
      nation: await db.nation.findUnique({ where: { id: nation.id } }),
      growths: await db.growth.findMany({ orderBy: { id: "asc" } }),
      additions: await db.addition.findMany({ orderBy: { id: "asc" } }),
    };
    const result = await linkNation(link(nation.id), db);
    expect(result.created).toBe(true);
    expect((await linkNation(link(nation.id), db)).created).toBe(false);
    expect(await db.nation.findUnique({ where: { id: nation.id } })).toEqual(
      before.nation,
    );
    expect(await db.growth.findMany({ orderBy: { id: "asc" } })).toEqual(
      before.growths,
    );
    expect(await db.addition.findMany({ orderBy: { id: "asc" } })).toEqual(
      before.additions,
    );
    const { links } = await memberLinks({ guildId, memberId }, db);
    expect(links.map((l) => l.nation.id)).toEqual([nation.id]);
    const { nations } = await searchNations("old", db);
    expect(nations[0]).toMatchObject({ id: nation.id, linkedMemberId: memberId });
  });

  test("a nation can only be linked once", async () => {
    const nation = await legacy();
    await linkNation(link(nation.id), db);
    await expect(
      linkNation(
        link(nation.id, { applicationId: "legacy-2", memberId: "600000000000000002" }),
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      linkNation(link("missing", { applicationId: "legacy-3" }), db),
    ).rejects.toMatchObject({ status: 404 });
  });

  test("release requires archived nations and allows a new registration", async () => {
    const nation = await legacy();
    await linkNation(link(nation.id), db);
    await expect(releaseMember({ guildId, memberId }, db)).rejects.toMatchObject(
      { status: 409 },
    );
    await db.nation.update({ where: { id: nation.id }, data: { isArchived: true } });
    const { released } = await releaseMember({ guildId, memberId }, db);
    expect(released).toHaveLength(1);
    const fresh = await createRegistration(payload(), db);
    expect(fresh.created).toBe(true);
    expect(await db.nation.findUnique({ where: { id: nation.id } })).not.toBeNull();
  });

  test("regions lists distinct tracker regions", async () => {
    await legacy();
    await createRegistration(payload(), db);
    expect((await regions(db)).regions).toEqual(["North", "West"]);
  });
});

test.skipIf(!existsSync("prisma/dev.db"))(
  "the migration applies to a copy of the live database without changing data",
  async () => {
    const checksum = () =>
      createHash("sha256").update(readFileSync("prisma/dev.db")).digest("hex");
    const before = checksum();
    mkdirSync(".test-data", { recursive: true });
    const path = resolve(`.test-data/migration-${randomUUID()}.db`);
    const source = new DatabaseSync("prisma/dev.db", { readOnly: true });
    try {
      await backup(source, path);
    } finally {
      source.close();
    }
    const copy = new DatabaseSync(path);
    const counts = () =>
      ["Nation", "Growth", "Addition", "Era", "Empire"].map(
        (table) => copy.prepare(`SELECT count(*) AS n FROM "${table}"`).get(),
      );
    try {
      const exists = copy
        .prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name='DiscordRegistration'`,
        )
        .get();
      const original = counts();
      if (!exists)
        copy.exec(
          readFileSync(
            "prisma/migrations/20261004000000_discord_registration/migration.sql",
            "utf8",
          ),
        );
      expect(counts()).toEqual(original);
      expect(copy.prepare("PRAGMA integrity_check").get()).toMatchObject({
        integrity_check: "ok",
      });
    } finally {
      copy.close();
    }
    const client = new PrismaClient({
      datasources: { db: { url: `file:${path.replaceAll("\\", "/")}` } },
    });
    try {
      expect(await client.discordRegistration.count()).toBeGreaterThanOrEqual(0);
    } finally {
      await client.$disconnect();
    }
    expect(checksum()).toBe(before);
  },
);
