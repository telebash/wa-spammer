-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "pkId" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Session" ("createdAt", "data", "id", "pkId", "sessionId", "status", "updatedAt") SELECT "createdAt", "data", "id", "pkId", "sessionId", "status", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_sessionId_idx" ON "Session"("sessionId");
CREATE UNIQUE INDEX "unique_id_per_session_id_session" ON "Session"("sessionId", "id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
