-- CreateTable
CREATE TABLE "TrackingOpen" (
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("campaignId", "recipientId")
);
