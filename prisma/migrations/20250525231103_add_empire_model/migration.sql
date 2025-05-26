/*
  Warnings:

  - You are about to drop the column `overlordId` on the `Nation` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Empire" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Nation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "startYear" INTEGER NOT NULL DEFAULT 1000,
    "startPopulation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "empireId" TEXT,
    CONSTRAINT "Nation_empireId_fkey" FOREIGN KEY ("empireId") REFERENCES "Empire" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Nation" ("createdAt", "description", "id", "isArchived", "name", "region", "startPopulation", "startYear", "updatedAt") SELECT "createdAt", "description", "id", "isArchived", "name", "region", "startPopulation", "startYear", "updatedAt" FROM "Nation";
DROP TABLE "Nation";
ALTER TABLE "new_Nation" RENAME TO "Nation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
