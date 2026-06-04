/*
  Warnings:

  - You are about to drop the column `event_id` on the `chain_raw_event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ton_event_id]` on the table `chain_raw_event` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ton_event_id` to the `chain_raw_event` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "chain_raw_event" DROP CONSTRAINT "chain_raw_event_event_id_fkey";

-- DropIndex
DROP INDEX "chain_raw_event_event_id_key";

-- AlterTable
ALTER TABLE "chain_raw_event" DROP COLUMN "event_id",
ADD COLUMN     "chain_event_id" UUID,
ADD COLUMN     "ton_event_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "chain_raw_event_ton_event_id_key" ON "chain_raw_event"("ton_event_id");

-- CreateIndex
CREATE INDEX "chain_raw_event_ton_event_id_idx" ON "chain_raw_event"("ton_event_id");
