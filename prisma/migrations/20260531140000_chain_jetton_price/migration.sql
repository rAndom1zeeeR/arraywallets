-- TonAPI TokenRates cache on jetton master (display prices).
ALTER TABLE "chain_jetton"
ADD COLUMN "price_usd" DECIMAL(36, 18),
ADD COLUMN "price_ton" DECIMAL(36, 18),
ADD COLUMN "diff_24h_usd" TEXT,
ADD COLUMN "diff_7d_usd" TEXT,
ADD COLUMN "diff_30d_usd" TEXT,
ADD COLUMN "price_updated_at" TIMESTAMPTZ(3);

CREATE INDEX "chain_jetton_price_updated_at_idx" ON "chain_jetton"("price_updated_at");
