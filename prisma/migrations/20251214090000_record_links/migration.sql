-- CreateTable
CREATE TABLE "RecordLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecordLink_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecordLink_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Record" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecordLink_targetId_idx" ON "RecordLink"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordLink_sourceId_targetId_label_key" ON "RecordLink"("sourceId", "targetId", "label");
