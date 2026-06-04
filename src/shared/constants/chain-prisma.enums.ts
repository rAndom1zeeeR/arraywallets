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
