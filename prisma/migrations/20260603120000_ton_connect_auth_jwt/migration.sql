-- AlterTable
ALTER TABLE "auth_user" ADD COLUMN "wallet_address" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "auth_user_wallet_address_key" ON "auth_user"("wallet_address");

-- CreateTable
CREATE TABLE "auth_refresh_token" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_ton_proof_challenge" (
    "id" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "used_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_ton_proof_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_refresh_token_token_hash_key" ON "auth_refresh_token"("token_hash");

-- CreateIndex
CREATE INDEX "auth_refresh_token_user_id_idx" ON "auth_refresh_token"("user_id");

-- CreateIndex
CREATE INDEX "auth_refresh_token_family_id_idx" ON "auth_refresh_token"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_ton_proof_challenge_payload_key" ON "auth_ton_proof_challenge"("payload");

-- CreateIndex
CREATE INDEX "auth_ton_proof_challenge_expires_at_idx" ON "auth_ton_proof_challenge"("expires_at");

-- AddForeignKey
ALTER TABLE "auth_refresh_token" ADD CONSTRAINT "auth_refresh_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
