-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "renewalDate" DATETIME NOT NULL,
    "cardName" TEXT NOT NULL DEFAULT 'Card',
    "reminderDays" INTEGER NOT NULL DEFAULT 3,
    "cadence" TEXT NOT NULL DEFAULT 'monthly',
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Subscription" ("amount", "cadence", "createdAt", "id", "name", "note", "reminderDays", "renewalDate", "updatedAt") SELECT "amount", "cadence", "createdAt", "id", "name", "note", "reminderDays", "renewalDate", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

