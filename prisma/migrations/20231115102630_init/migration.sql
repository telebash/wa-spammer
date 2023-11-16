-- CreateTable
CREATE TABLE "Session" (
    "pkId" BIGINT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Session_sessionId_idx" ON "Session"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "unique_id_per_session_id_session" ON "Session"("sessionId", "id");
