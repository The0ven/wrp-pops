-- CreateTable
CREATE TABLE "Nation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "region" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "startYear" INTEGER NOT NULL DEFAULT 1000,
    "startPopulation" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "vassalIds" TEXT NOT NULL,
    "overlordId" TEXT
);

-- CreateTable
CREATE TABLE "Era" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Growth" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startPopulation" INTEGER NOT NULL,
    "growthRate" REAL NOT NULL,
    "endPopulation" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nationId" TEXT NOT NULL,
    "eraId" TEXT NOT NULL,
    CONSTRAINT "Growth_eraId_fkey" FOREIGN KEY ("eraId") REFERENCES "Era" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Growth_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Addition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nationId" TEXT NOT NULL,
    "eraId" TEXT NOT NULL,
    CONSTRAINT "Addition_eraId_fkey" FOREIGN KEY ("eraId") REFERENCES "Era" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Addition_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
