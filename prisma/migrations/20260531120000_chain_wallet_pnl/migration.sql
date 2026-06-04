-- CreateEnum
CREATE TYPE "ChainWalletPnlAssetKind" AS ENUM ('ton', 'usdt', 'jetton');

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
CREATE INDEX "chain_wallet_pnl_wallet_address_idx" ON "chain_wallet_pnl"("wallet_address");

-- CreateIndex
CREATE INDEX "chain_wallet_pnl_wallet_address_asset_kind_idx" ON "chain_wallet_pnl"("wallet_address", "asset_kind");

-- CreateIndex
CREATE INDEX "chain_wallet_pnl_jetton_id_idx" ON "chain_wallet_pnl"("jetton_id");

-- CreateIndex
CREATE UNIQUE INDEX "chain_wallet_pnl_wallet_address_asset_key_key" ON "chain_wallet_pnl"("wallet_address", "asset_key");

-- AddForeignKey
ALTER TABLE "chain_wallet_pnl" ADD CONSTRAINT "chain_wallet_pnl_jetton_id_fkey" FOREIGN KEY ("jetton_id") REFERENCES "chain_jetton"("id") ON DELETE SET NULL ON UPDATE CASCADE;
