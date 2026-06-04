-- CreateEnum
CREATE TYPE "ChainJettonVerification" AS ENUM ('none', 'whitelist', 'graylist', 'blacklist');

-- CreateEnum
CREATE TYPE "ChainActionType" AS ENUM ('TON_TRANSFER', 'JETTON_TRANSFER', 'FLAWED_JETTON_TRANSFER', 'JETTON_SWAP', 'INFERRED_SWAP', 'JETTON_BURN', 'JETTON_MINT', 'SMART_CONTRACT_EXEC', 'DEPOSIT_STAKE', 'WITHDRAW_STAKE', 'NFT_TRANSFER', 'NFT_MINT', 'NFT_SALE', 'SUBSCRIBE', 'UNSUBSCRIBE', 'AUCTION_BID', 'DOMAIN_RENEW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ChainActionStatus" AS ENUM ('success', 'failed', 'pending');

-- CreateEnum
CREATE TYPE "ChainActionDirection" AS ENUM ('incoming', 'outgoing', 'self', 'unknown');

-- CreateEnum
CREATE TYPE "ChainSyncStatus" AS ENUM ('idle', 'syncing', 'paused', 'error', 'completed');

-- CreateEnum
CREATE TYPE "ChainWalletPnlAssetKind" AS ENUM ('ton', 'usdt', 'jetton');

-- CreateTable
CREATE TABLE "chain_address" (
    "id" UUID NOT NULL,
    "raw_address" TEXT NOT NULL,
    "name" TEXT,
    "is_scam" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "is_wallet" BOOLEAN NOT NULL DEFAULT false,
    "first_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL,
    "events_count" INTEGER NOT NULL DEFAULT 0,
    "actions_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "chain_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_jetton" (
    "id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL,
    "image" TEXT,
    "verification" "ChainJettonVerification" NOT NULL DEFAULT 'none',
    "score" INTEGER NOT NULL DEFAULT 0,
    "price_usd" DECIMAL(36,18),
    "price_ton" DECIMAL(36,18),
    "diff_24h_usd" TEXT,
    "diff_7d_usd" TEXT,
    "diff_30d_usd" TEXT,
    "price_updated_at" TIMESTAMPTZ(3),
    "first_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_jetton_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_event" (
    "id" UUID NOT NULL,
    "ton_event_id" TEXT NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(3) NOT NULL,
    "lt" DECIMAL(78,0) NOT NULL,
    "is_scam" BOOLEAN NOT NULL DEFAULT false,
    "in_progress" BOOLEAN NOT NULL DEFAULT false,
    "extra" BIGINT NOT NULL,
    "raw_data" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_raw_event" (
    "id" UUID NOT NULL,
    "ton_event_id" TEXT NOT NULL,
    "chain_event_id" UUID,
    "wallet_address" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(3),
    "process_error" TEXT,

    CONSTRAINT "chain_raw_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_action" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "type" "ChainActionType" NOT NULL,
    "status" "ChainActionStatus" NOT NULL DEFAULT 'success',
    "from_id" UUID,
    "to_id" UUID,
    "direction" "ChainActionDirection",
    "amount" DECIMAL(78,0),
    "amount_in" DECIMAL(78,0),
    "amount_out" DECIMAL(78,0),
    "ton_in" DECIMAL(78,0),
    "ton_out" DECIMAL(78,0),
    "jetton_id" UUID,
    "jetton_in_id" UUID,
    "jetton_out_id" UUID,
    "metadata" JSONB,
    "display_amount" TEXT,
    "display_details" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_sync_state" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "last_lt" DECIMAL(78,0),
    "last_timestamp" TIMESTAMPTZ(3),
    "last_ton_event_id" TEXT,
    "status" "ChainSyncStatus" NOT NULL DEFAULT 'idle',
    "error" TEXT,
    "events_synced" INTEGER NOT NULL DEFAULT 0,
    "actions_synced" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chain_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chain_wallet_pnl" (
    "id" UUID NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "asset_kind" "ChainWalletPnlAssetKind" NOT NULL,
    "asset_key" TEXT NOT NULL,
    "jetton_id" UUID,
    "decimals" INTEGER,
    "spent_raw" DECIMAL(78,0) NOT NULL,
    "received_raw" DECIMAL(78,0) NOT NULL,
    "net_raw" DECIMAL(78,0) NOT NULL,
    "swap_count" INTEGER NOT NULL DEFAULT 0,
    "computed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chain_wallet_pnl_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chain_address_raw_address_key" ON "chain_address"("raw_address");

-- CreateIndex
CREATE UNIQUE INDEX "chain_jetton_address_key" ON "chain_jetton"("address");

-- CreateIndex
CREATE INDEX "chain_jetton_address_idx" ON "chain_jetton"("address");

-- CreateIndex
CREATE INDEX "chain_jetton_symbol_idx" ON "chain_jetton"("symbol");

-- CreateIndex
CREATE INDEX "chain_jetton_verification_idx" ON "chain_jetton"("verification");

-- CreateIndex
CREATE UNIQUE INDEX "chain_event_ton_event_id_key" ON "chain_event"("ton_event_id");

-- CreateIndex
CREATE INDEX "chain_event_wallet_address_timestamp_idx" ON "chain_event"("wallet_address", "timestamp");

-- CreateIndex
CREATE INDEX "chain_event_lt_idx" ON "chain_event"("lt");

-- CreateIndex
CREATE INDEX "chain_event_ton_event_id_idx" ON "chain_event"("ton_event_id");

-- CreateIndex
CREATE INDEX "chain_event_created_at_idx" ON "chain_event"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "chain_raw_event_ton_event_id_key" ON "chain_raw_event"("ton_event_id");

-- CreateIndex
CREATE INDEX "chain_raw_event_wallet_address_idx" ON "chain_raw_event"("wallet_address");

-- CreateIndex
CREATE INDEX "chain_raw_event_ton_event_id_idx" ON "chain_raw_event"("ton_event_id");

-- CreateIndex
CREATE INDEX "chain_raw_event_fetched_at_idx" ON "chain_raw_event"("fetched_at");

-- CreateIndex
CREATE INDEX "chain_action_event_id_idx" ON "chain_action"("event_id");

-- CreateIndex
CREATE INDEX "chain_action_from_id_idx" ON "chain_action"("from_id");

-- CreateIndex
CREATE INDEX "chain_action_to_id_idx" ON "chain_action"("to_id");

-- CreateIndex
CREATE INDEX "chain_action_jetton_id_idx" ON "chain_action"("jetton_id");

-- CreateIndex
CREATE INDEX "chain_action_wallet_address_created_at_idx" ON "chain_action"("wallet_address", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chain_action_wallet_address_type_direction_created_at_idx" ON "chain_action"("wallet_address", "type", "direction", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chain_action_direction_type_created_at_idx" ON "chain_action"("direction", "type", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chain_action_event_id_order_index_key" ON "chain_action"("event_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "chain_sync_state_wallet_address_key" ON "chain_sync_state"("wallet_address");

-- CreateIndex
CREATE INDEX "chain_sync_state_status_idx" ON "chain_sync_state"("status");

-- CreateIndex
CREATE INDEX "chain_sync_state_updated_at_idx" ON "chain_sync_state"("updated_at");

-- CreateIndex
CREATE INDEX "chain_sync_state_last_ton_event_id_idx" ON "chain_sync_state"("last_ton_event_id");

-- CreateIndex
CREATE INDEX "chain_wallet_pnl_wallet_address_idx" ON "chain_wallet_pnl"("wallet_address");

-- CreateIndex
CREATE INDEX "chain_wallet_pnl_wallet_address_asset_kind_idx" ON "chain_wallet_pnl"("wallet_address", "asset_kind");

-- CreateIndex
CREATE INDEX "chain_wallet_pnl_jetton_id_idx" ON "chain_wallet_pnl"("jetton_id");

-- CreateIndex
CREATE UNIQUE INDEX "chain_wallet_pnl_wallet_address_asset_key_key" ON "chain_wallet_pnl"("wallet_address", "asset_key");

-- AddForeignKey
ALTER TABLE "chain_raw_event" ADD CONSTRAINT "chain_raw_event_chain_event_id_fkey" FOREIGN KEY ("chain_event_id") REFERENCES "chain_event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "chain_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "chain_address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "chain_address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_jetton_id_fkey" FOREIGN KEY ("jetton_id") REFERENCES "chain_jetton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_jetton_in_id_fkey" FOREIGN KEY ("jetton_in_id") REFERENCES "chain_jetton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_action" ADD CONSTRAINT "chain_action_jetton_out_id_fkey" FOREIGN KEY ("jetton_out_id") REFERENCES "chain_jetton"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_sync_state" ADD CONSTRAINT "chain_sync_state_last_ton_event_id_fkey" FOREIGN KEY ("last_ton_event_id") REFERENCES "chain_event"("ton_event_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chain_wallet_pnl" ADD CONSTRAINT "chain_wallet_pnl_jetton_id_fkey" FOREIGN KEY ("jetton_id") REFERENCES "chain_jetton"("id") ON DELETE SET NULL ON UPDATE CASCADE;
