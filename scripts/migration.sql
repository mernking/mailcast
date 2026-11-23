-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "SenderAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "passwordEnc" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SenderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "telegram" TEXT,
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" TEXT NOT NULL DEFAULT '[]',
    "buttonText" TEXT NOT NULL DEFAULT 'Subscribe',
    "successMessage" TEXT NOT NULL DEFAULT 'Thanks for subscribing!',
    "redirectUrl" TEXT,
    "tagsToAdd" TEXT NOT NULL DEFAULT '',
    "accentColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "backgroundColor" TEXT NOT NULL DEFAULT '#ffffff',
    "textColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "data" TEXT NOT NULL DEFAULT '{}',
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#1a1a1a',
    "formId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactGroupAssignment" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactGroupAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "triggerConfig" TEXT NOT NULL DEFAULT '{}',
    "senderId" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enrolledCount" INTEGER NOT NULL DEFAULT 0,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationEnrollment" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "currentNodeId" TEXT NOT NULL DEFAULT '',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TrackingToken" (
    "token" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "TrackingOpen" (
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingOpen_pkey" PRIMARY KEY ("campaignId","recipientId")
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_email_idx" ON "Contact"("email");

-- CreateIndex
CREATE INDEX "Contact_active_idx" ON "Contact"("active");

-- CreateIndex
CREATE INDEX "Contact_telegram_idx" ON "Contact"("telegram");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecipient_campaignId_contactId_key" ON "CampaignRecipient"("campaignId", "contactId");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroup_formId_key" ON "ContactGroup"("formId");

-- CreateIndex
CREATE INDEX "ContactGroupAssignment_groupId_idx" ON "ContactGroupAssignment"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactGroupAssignment_contactId_groupId_key" ON "ContactGroupAssignment"("contactId", "groupId");

-- CreateIndex
CREATE INDEX "AutomationEnrollment_status_dueAt_idx" ON "AutomationEnrollment"("status", "dueAt");

-- CreateIndex
CREATE INDEX "AutomationEnrollment_workflowId_idx" ON "AutomationEnrollment"("workflowId");

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

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "SenderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_targetGroupId_fkey" FOREIGN KEY ("targetGroupId") REFERENCES "ContactGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroup" ADD CONSTRAINT "ContactGroup_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupAssignment" ADD CONSTRAINT "ContactGroupAssignment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactGroupAssignment" ADD CONSTRAINT "ContactGroupAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ContactGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "SenderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationEnrollment" ADD CONSTRAINT "AutomationEnrollment_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationEnrollment" ADD CONSTRAINT "AutomationEnrollment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

