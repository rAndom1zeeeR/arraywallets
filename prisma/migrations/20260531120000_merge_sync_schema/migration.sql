-- Merge sync-events + address-normalization schema additions

-- chain_address counters (sync-events)
ALTER TABLE "chain_address" ADD COLUMN IF NOT EXISTS "events_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "chain_address" ADD COLUMN IF NOT EXISTS "actions_count" INTEGER NOT NULL DEFAULT 0;

-- chain_event embedded raw payload (sync-events)
ALTER TABLE "chain_event" ADD COLUMN IF NOT EXISTS "raw_data" JSONB;

-- chain_action.wallet_address (address-normalization v1)
ALTER TABLE "chain_action" ADD COLUMN IF NOT EXISTS "wallet_address" TEXT;

UPDATE "chain_action" AS a
SET "wallet_address" = e."wallet_address"
FROM "chain_event" AS e
WHERE a."event_id" = e."id" AND a."wallet_address" IS NULL;

ALTER TABLE "chain_action" ALTER COLUMN "wallet_address" SET NOT NULL;

-- Rename sync cursor column when upgrading from sync-events migrations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chain_sync_state' AND column_name = 'last_event_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chain_sync_state' AND column_name = 'last_ton_event_id'
  ) THEN
    ALTER TABLE "chain_sync_state" RENAME COLUMN "last_event_id" TO "last_ton_event_id";
  END IF;
END $$;

-- FK to chain_event.ton_event_id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chain_sync_state_last_ton_event_id_fkey'
  ) THEN
    ALTER TABLE "chain_sync_state"
      ADD CONSTRAINT "chain_sync_state_last_ton_event_id_fkey"
      FOREIGN KEY ("last_ton_event_id") REFERENCES "chain_event"("ton_event_id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Jetton verification enum (address-normalization v1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChainJettonVerification') THEN
    CREATE TYPE "ChainJettonVerification" AS ENUM ('none', 'whitelist', 'graylist', 'blacklist');
  END IF;
END $$;

ALTER TABLE "chain_jetton"
  ALTER COLUMN "verification" DROP DEFAULT;

ALTER TABLE "chain_jetton"
  ALTER COLUMN "verification" TYPE "ChainJettonVerification"
  USING (
    CASE lower("verification"::text)
      WHEN 'whitelist' THEN 'whitelist'::"ChainJettonVerification"
      WHEN 'graylist' THEN 'graylist'::"ChainJettonVerification"
      WHEN 'blacklist' THEN 'blacklist'::"ChainJettonVerification"
      ELSE 'none'::"ChainJettonVerification"
    END
  );

ALTER TABLE "chain_jetton"
  ALTER COLUMN "verification" SET DEFAULT 'none'::"ChainJettonVerification";

CREATE INDEX IF NOT EXISTS "chain_jetton_verification_idx" ON "chain_jetton"("verification");

-- FLAWED_JETTON_TRANSFER (sync-events)
ALTER TYPE "ChainActionType" ADD VALUE IF NOT EXISTS 'FLAWED_JETTON_TRANSFER';

-- chain_action indexes from v1
CREATE UNIQUE INDEX IF NOT EXISTS "chain_action_event_id_order_index_key"
  ON "chain_action"("event_id", "order_index");

CREATE INDEX IF NOT EXISTS "chain_action_wallet_address_created_at_idx"
  ON "chain_action"("wallet_address", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "chain_action_wallet_address_type_direction_created_at_idx"
  ON "chain_action"("wallet_address", "type", "direction", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "chain_action_direction_type_created_at_idx"
  ON "chain_action"("direction", "type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "chain_sync_state_last_ton_event_id_idx"
  ON "chain_sync_state"("last_ton_event_id");
