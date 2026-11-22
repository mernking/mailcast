-- CreateTable
CREATE TABLE "TrackingToken" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tokenId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'markdown',
    "preheader" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "senderId" TEXT NOT NULL,
    "targetGroupId" TEXT,
    "totalRecip" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "clickedCount" INTEGER NOT NULL DEFAULT 0,
    "trackOpens" BOOLEAN NOT NULL DEFAULT false,
    "trackClicks" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sentAt" DATETIME,
    CONSTRAINT "Campaign_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "SenderAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Campaign_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "ContactGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("content", "contentType", "createdAt", "failedCount", "id", "openedCount", "preheader", "senderId", "sentAt", "sentCount", "status", "subject", "targetGroupId", "title", "totalRecip", "updatedAt") SELECT "content", "contentType", "createdAt", "failedCount", "id", "openedCount", "preheader", "senderId", "sentAt", "sentCount", "status", "subject", "targetGroupId", "title", "totalRecip", "updatedAt" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TrackingToken_token_key" ON "TrackingToken"("token");

-- CreateIndex
CREATE INDEX "TrackingToken_campaignId_kind_idx" ON "TrackingToken"("campaignId", "kind");

-- CreateIndex
CREATE INDEX "TrackingToken_recipientId_campaignId_kind_idx" ON "TrackingToken"("recipientId", "campaignId", "kind");

-- CreateIndex
CREATE INDEX "TrackingEvent_campaignId_kind_idx" ON "TrackingEvent"("campaignId", "kind");

-- CreateIndex
CREATE INDEX "TrackingEvent_recipientId_campaignId_kind_idx" ON "TrackingEvent"("recipientId", "campaignId", "kind");
