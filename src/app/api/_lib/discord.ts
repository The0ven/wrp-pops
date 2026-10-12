import { createHash, timingSafeEqual } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { population, year } from "@/lib/validation";
import { RequestError, respond } from "./errors";
import { insertNation } from "./records";

type Transaction = Prisma.TransactionClient;
type Link = Prisma.DiscordRegistrationGetPayload<{ include: { nation: true } }>;

const snowflake = z.string().regex(/^\d{5,25}$/, "Must be a Discord ID");
const applicationId = z.string().trim().min(1).max(100);
const member = z.object({ guildId: snowflake, memberId: snowflake });

export const registrationSchema = member.extend({
  applicationId,
  threadId: snowflake.nullable().optional(),
  registrationUrl: z.string().url().max(500).nullable().optional(),
  name: z.string().trim().min(1, "Name is required").max(100),
  officialName: z.string().trim().min(1).max(300),
  region: z.string().trim().min(1, "Region is required").max(100),
  startPopulation: population,
  startYear: year,
});
export const linkSchema = member.extend({
  applicationId,
  threadId: snowflake.nullable().optional(),
  nationId: z.string().trim().min(1),
});

/** Throws unless the request carries the configured shared secret. */
export function authorize(request: Request) {
  const expected = process.env.DISCORD_INTEGRATION_TOKEN;
  if (!expected)
    throw new RequestError("Discord integration is not configured", 503);
  const match = /^Bearer\s+(\S+)$/i.exec(
    (request.headers.get("authorization") ?? "").trim(),
  );
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!match || !timingSafeEqual(digest(match[1]), digest(expected)))
    throw new RequestError("Unauthorized", 401);
}

export function integration(
  request: Request,
  work: () => Promise<unknown>,
  status = 200,
) {
  return respond(async () => {
    authorize(request);
    return work();
  }, status);
}

function payloadHash(value: Record<string, unknown>) {
  const canonical = JSON.stringify(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]]),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

function present(link: Link, created: boolean) {
  const { nation } = link;
  return {
    created,
    nation: {
      id: nation.id,
      name: nation.name,
      region: nation.region,
      isArchived: nation.isArchived,
      startYear: nation.startYear,
      startPopulation: nation.startPopulation,
    },
    registration: {
      applicationId: link.applicationId,
      guildId: link.guildId,
      memberId: link.memberId,
      threadId: link.threadId,
      source: link.source,
      releasedAt: link.releasedAt,
    },
    nationPath: `/nations/${nation.id}`,
  };
}

function replay(link: Link, hash: string) {
  if (link.payloadHash !== hash)
    throw new RequestError(
      "This application was already provisioned with different details",
      409,
    );
  return present(link, false);
}

async function requireNoActiveLink(
  tx: Transaction,
  guildId: string,
  memberId: string,
) {
  const active = await tx.discordRegistration.findFirst({
    where: { guildId, memberId, releasedAt: null },
    include: { nation: true },
  });
  if (active)
    throw new RequestError(
      `This member is already linked to ${active.nation.name}`,
      409,
    );
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Idempotent: replays with identical details return the original nation. */
export async function createRegistration(
  input: unknown,
  db: PrismaClient = prisma,
) {
  const data = registrationSchema.parse(input);
  const hash = payloadHash({
    guildId: data.guildId,
    memberId: data.memberId,
    name: data.name,
    officialName: data.officialName,
    region: data.region,
    startPopulation: data.startPopulation,
    startYear: data.startYear,
  });
  const find = () =>
    db.discordRegistration.findUnique({
      where: { applicationId: data.applicationId },
      include: { nation: true },
    });
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.discordRegistration.findUnique({
        where: { applicationId: data.applicationId },
        include: { nation: true },
      });
      if (existing) return replay(existing, hash);
      await requireNoActiveLink(tx, data.guildId, data.memberId);
      const clash = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Nation" WHERE lower("name") = lower(${data.name}) LIMIT 1`;
      if (clash.length)
        throw new RequestError(
          `A nation named "${data.name}" already exists. Link it explicitly or choose another name.`,
          409,
        );
      const description = [
        `Official name: ${data.officialName}`,
        data.registrationUrl && `Registration: ${data.registrationUrl}`,
      ]
        .filter(Boolean)
        .join("\n");
      const nation = await insertNation(tx, {
        name: data.name,
        region: data.region,
        description,
        startYear: data.startYear,
        startPopulation: data.startPopulation,
      });
      const link = await tx.discordRegistration.create({
        data: {
          applicationId: data.applicationId,
          guildId: data.guildId,
          memberId: data.memberId,
          threadId: data.threadId ?? null,
          nationId: nation.id,
          payloadHash: hash,
          source: "registration",
        },
        include: { nation: true },
      });
      return present(link, true);
    });
  } catch (error) {
    // A concurrent identical request may have won the unique application ID.
    if (isUniqueViolation(error)) {
      const existing = await find();
      if (existing) return replay(existing, hash);
    }
    throw error;
  }
}

/** Links an existing tracker nation to a member without touching its history. */
export async function linkNation(input: unknown, db: PrismaClient = prisma) {
  const data = linkSchema.parse(input);
  const hash = payloadHash({
    guildId: data.guildId,
    memberId: data.memberId,
    nationId: data.nationId,
  });
  try {
    return await db.$transaction(async (tx) => {
      const existing = await tx.discordRegistration.findUnique({
        where: { applicationId: data.applicationId },
        include: { nation: true },
      });
      if (existing) return replay(existing, hash);
      const nation = await tx.nation.findUnique({
        where: { id: data.nationId },
        include: { discordRegistration: true },
      });
      if (!nation) throw new RequestError("Nation not found", 404);
      if (nation.discordRegistration)
        throw new RequestError(
          `${nation.name} is already linked to a Discord member`,
          409,
        );
      await requireNoActiveLink(tx, data.guildId, data.memberId);
      const link = await tx.discordRegistration.create({
        data: {
          applicationId: data.applicationId,
          guildId: data.guildId,
          memberId: data.memberId,
          threadId: data.threadId ?? null,
          nationId: nation.id,
          payloadHash: hash,
          source: "link",
        },
        include: { nation: true },
      });
      return present(link, true);
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new RequestError("This nation or application is already linked", 409);
    throw error;
  }
}

/** Lets a member register again once every linked nation is archived. */
export async function releaseMember(input: unknown, db: PrismaClient = prisma) {
  const { guildId, memberId } = member.parse(input);
  return db.$transaction(async (tx) => {
    const links = await tx.discordRegistration.findMany({
      where: { guildId, memberId, releasedAt: null },
      include: { nation: true },
    });
    const live = links.filter((link) => !link.nation.isArchived);
    if (live.length)
      throw new RequestError(
        `Archive ${live.map((l) => l.nation.name).join(", ")} in the tracker before releasing this member`,
        409,
      );
    const releasedAt = new Date();
    await tx.discordRegistration.updateMany({
      where: { id: { in: links.map((l) => l.id) } },
      data: { releasedAt },
    });
    return {
      released: links.map((link) => present({ ...link, releasedAt }, false)),
    };
  });
}

export async function regions(db: PrismaClient = prisma) {
  const rows = await db.nation.findMany({
    distinct: ["region"],
    select: { region: true },
    orderBy: { region: "asc" },
  });
  return { regions: rows.map((r) => r.region) };
}

export async function searchNations(query: string, db: PrismaClient = prisma) {
  const term = query.trim().slice(0, 100);
  const nations = await db.nation.findMany({
    where: term ? { name: { contains: term } } : undefined,
    include: { discordRegistration: true },
    orderBy: { name: "asc" },
    take: 25,
  });
  return {
    nations: nations.map((n) => ({
      id: n.id,
      name: n.name,
      region: n.region,
      isArchived: n.isArchived,
      linkedMemberId: n.discordRegistration?.memberId ?? null,
    })),
  };
}

export async function memberLinks(input: unknown, db: PrismaClient = prisma) {
  const { guildId, memberId } = member.parse(input);
  const links = await db.discordRegistration.findMany({
    where: { guildId, memberId },
    include: { nation: true },
    orderBy: { createdAt: "asc" },
  });
  return { links: links.map((link) => present(link, false)) };
}
