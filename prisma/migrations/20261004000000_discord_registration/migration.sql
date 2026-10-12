-- CreateTable
CREATE TABLE "DiscordRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "threadId" TEXT,
    "nationId" TEXT NOT NULL,
    "payloadHash" TEXT,
    "source" TEXT NOT NULL DEFAULT 'registration',
    "releasedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DiscordRegistration_nationId_fkey" FOREIGN KEY ("nationId") REFERENCES "Nation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscordRegistration_applicationId_key" ON "DiscordRegistration"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordRegistration_nationId_key" ON "DiscordRegistration"("nationId");

-- CreateIndex
CREATE INDEX "DiscordRegistration_guildId_memberId_idx" ON "DiscordRegistration"("guildId", "memberId");
