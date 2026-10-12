import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const latestGrowthOrder: Prisma.GrowthOrderByWithRelationInput[] = [
  { era: { endYear: "desc" } },
  { era: { startYear: "desc" } },
  { createdAt: "desc" },
];
export function fetchNations() {
  return prisma.nation.findMany({
    orderBy: [{ isArchived: "asc" }, { region: "asc" }, { name: "asc" }],
    include: {
      growths: { include: { era: true }, orderBy: latestGrowthOrder },
    },
  });
}
export function getNation(id: string) {
  return prisma.nation.findUnique({
    where: { id },
    include: {
      growths: { include: { era: true }, orderBy: latestGrowthOrder },
    },
  });
}
export function getEras() {
  return prisma.era.findMany({
    orderBy: [{ startYear: "asc" }, { endYear: "asc" }],
    include: {
      growths: {
        include: { nation: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
      additions: {
        include: { nation: true },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      },
    },
  });
}
export async function getPopulationTimeline() {
  // Each nation is sent once instead of repeating it inside every historical row.
  const [eras, nations] = await Promise.all([
    prisma.era.findMany({
      orderBy: [{ startYear: "asc" }, { endYear: "asc" }],
      include: { growths: true, additions: true },
    }),
    prisma.nation.findMany({ orderBy: [{ region: "asc" }, { name: "asc" }] }),
  ]);
  return { eras, nations };
}
export function getEra(id: string) {
  return prisma.era.findUnique({
    where: { id },
    include: { growths: { include: { nation: true } }, additions: true },
  });
}
export function getEmpires() {
  return prisma.empire.findMany({
    orderBy: { name: "asc" },
    include: { vassals: { orderBy: { name: "asc" } } },
  });
}
export function getEmpire(id: string) {
  return prisma.empire.findUnique({
    where: { id },
    include: { vassals: { orderBy: { name: "asc" } } },
  });
}
export function getGrowths() {
  return prisma.growth.findMany({
    orderBy: latestGrowthOrder,
    include: { nation: true, era: true },
  });
}
export function getGrowth(id: string) {
  return prisma.growth.findUnique({ where: { id } });
}
export function getAddition(id: string) {
  return prisma.addition.findUnique({ where: { id } });
}
export function getAdditions(nationId: string, eraId: string) {
  return prisma.addition.findMany({
    where: { nationId, eraId },
    include: { nation: true, era: true },
    orderBy: [{ year: "asc" }, { createdAt: "asc" }],
  });
}
