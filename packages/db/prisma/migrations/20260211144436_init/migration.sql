-- CreateTable
CREATE TABLE "TxSecureRecord" (
    "id" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload_nonce" TEXT NOT NULL,
    "payload_ct" TEXT NOT NULL,
    "payload_tag" TEXT NOT NULL,
    "dek_wrap_nonce" TEXT NOT NULL,
    "dek_wrapped" TEXT NOT NULL,
    "dek_wrap_tag" TEXT NOT NULL,
    "alg" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "mk_version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "TxSecureRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TxSecureRecord_partyId_idx" ON "TxSecureRecord"("partyId");
