import type { AssetId } from "@ston-fi/omniston-sdk-react";
import { z } from "zod";

import type { Brand } from "@/modules/omniston/demo/lib/types";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";

import { Chain, EVM_CHAINS } from "./chain";

export const assetIdSchema = z.object({
  chain: z.discriminatedUnion("$case", [
    z.object({
      $case: z.literal(Chain.TON),
      value: z.object({
        kind: z.discriminatedUnion("$case", [
          z.object({
            $case: z.literal("native"),
            value: z.object({}),
          }),
          z.object({
            $case: z.literal("jetton"),
            value: z.string().nonempty(),
          }),
        ]),
      }),
    }),
    z.object({
      $case: z.literal(EVM_CHAINS),
      value: z.object({
        kind: z.discriminatedUnion("$case", [
          z.object({
            $case: z.literal("native"),
            value: z.object({}),
          }),
          z.object({
            $case: z.literal("erc20"),
            value: z.string().nonempty(),
          }),
        ]),
      }),
    }),
  ]),
}) satisfies z.ZodType<AssetId>;

export type SerializedAssetId = Brand<string, "SerializedAssetId">;

/** Canonical AssetId (bounceable TON jetton addresses, etc.). */
export function normalizeAssetId(assetId: AssetId): AssetId {
  if (assetId.chain.$case !== Chain.TON) {
    return assetId;
  }

  if (assetId.chain.value.kind.$case !== "jetton") {
    return assetId;
  }

  try {
    return {
      chain: {
        $case: Chain.TON,
        value: {
          kind: {
            $case: "jetton",
            value: normalizeWalletAddress(assetId.chain.value.kind.value),
          },
        },
      },
    };
  } catch {
    return assetId;
  }
}

export function serializeAssetId(assetId: AssetId): SerializedAssetId {
  return JSON.stringify(assetIdSchema.parse(normalizeAssetId(assetId))) as SerializedAssetId;
}

export function deserializeAssetId(serialized: string): AssetId {
  return assetIdSchema.parse(JSON.parse(serialized));
}

export function isAssetIdEqual(
  a: AssetId | null | undefined,
  b: AssetId | null | undefined,
): boolean {
  if (!a || !b) return false;
  return serializeAssetId(a) === serializeAssetId(b);
}

export function getNativeAssetIdForChain(chainId: AssetId["chain"]["$case"]): AssetId {
  return {
    chain: {
      $case: chainId,
      value: { kind: { $case: "native", value: {} } },
    },
  };
}
