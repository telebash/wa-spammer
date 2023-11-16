/*
  Warnings:

  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "pkId" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL
);
INSERT INTO "new_Session" ("data", "id", "pkId", "sessionId") SELECT "data", "id", "pkId", "sessionId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_sessionId_idx" ON "Session"("sessionId");
CREATE UNIQUE INDEX "unique_id_per_session_id_session" ON "Session"("sessionId", "id");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
