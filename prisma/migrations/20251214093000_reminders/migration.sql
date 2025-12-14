-- CreateTable
CREATE TABLE "Reminder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kind" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "triggerAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Reminder_triggerAt_delivered_idx" ON "Reminder"("triggerAt", "delivered");

-- CreateIndex
CREATE INDEX "Reminder_source_sourceId_idx" ON "Reminder"("source", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_source_sourceId_key" ON "Reminder"("source", "sourceId");
