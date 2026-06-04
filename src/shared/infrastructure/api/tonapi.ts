/**
 * Single entry point for TonAPI packages (@random1ze/*).
 * Import SDK types and classes from `@/shared/infrastructure/api/ton-api`, not from package names directly.
 */

export { TonApiClient } from "@random1ze/ton-api-client";
export type {
  AccountAddress,
  AccountEvent,
  AccountEvents,
  Action,
  JettonPreview,
  TokenRates,
  TonApiError,
} from "@random1ze/ton-api-client";

export { ContractAdapter } from "@random1ze/ton-api-adapter";
