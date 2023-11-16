/*
  Warnings:

  - Added the required column `status` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "pkId" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Session" ("data", "id", "pkId", "sessionId") SELECT "data", "id", "pkId", "sessionId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_sessionId_idx" ON "Session"("sessionId");
CREATE UNIQUE INDEX "unique_id_per_session_id_session" ON "Session"("sessionId", "id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
