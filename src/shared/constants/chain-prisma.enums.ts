/**
 * Client-safe mirrors of Prisma enums from `schema.prisma`.
 * Do not import `@/shared/infrastructure/api/prisma-client` in `"use client"` modules.
 */

export const ChainSyncStatus = {
  IDLE: "IDLE",
  SYNCING: "SYNCING",
  PAUSED: "PAUSED",
  ERROR: "ERROR",
  COMPLETED: "COMPLETED",
} as const;

export type ChainSyncStatusValue = (typeof ChainSyncStatus)[keyof typeof ChainSyncStatus];

export const ChainActionDirection = {
  INCOMING: "INCOMING",
  OUTGOING: "OUTGOING",
  SELF: "SELF",
  UNKNOWN: "UNKNOWN",
} as const;

export type ChainActionDirectionValue = (typeof ChainActionDirection)[keyof typeof ChainActionDirection];

export const CHAIN_ACTION_DIRECTION_VALUES: ChainActionDirectionValue[] =
  Object.values(ChainActionDirection);

export const ChainActionStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PENDING: "PENDING",
} as const;

export type ChainActionStatusValue = (typeof ChainActionStatus)[keyof typeof ChainActionStatus];

export const CHAIN_ACTION_STATUS_VALUES: ChainActionStatusValue[] = Object.values(ChainActionStatus);

/** Mirrors `ChainActionType` in `schema.prisma`. */
export const ChainActionType = {
  TON_TRANSFER: "TON_TRANSFER",
  JETTON_TRANSFER: "JETTON_TRANSFER",
  FLAWED_JETTON_TRANSFER: "FLAWED_JETTON_TRANSFER",
  JETTON_SWAP: "JETTON_SWAP",
  INFERRED_SWAP: "INFERRED_SWAP",
  JETTON_BURN: "JETTON_BURN",
  JETTON_MINT: "JETTON_MINT",
  SMART_CONTRACT_EXEC: "SMART_CONTRACT_EXEC",
  DEPOSIT_STAKE: "DEPOSIT_STAKE",
  WITHDRAW_STAKE: "WITHDRAW_STAKE",
  NFT_TRANSFER: "NFT_TRANSFER",
  NFT_MINT: "NFT_MINT",
  NFT_SALE: "NFT_SALE",
  SUBSCRIBE: "SUBSCRIBE",
  UNSUBSCRIBE: "UNSUBSCRIBE",
  AUCTION_BID: "AUCTION_BID",
  DOMAIN_RENEW: "DOMAIN_RENEW",
  UNKNOWN: "UNKNOWN",
} as const;

export type ChainActionTypeValue = (typeof ChainActionType)[keyof typeof ChainActionType];

export const CHAIN_ACTION_TYPE_VALUES: ChainActionTypeValue[] = Object.values(ChainActionType);
