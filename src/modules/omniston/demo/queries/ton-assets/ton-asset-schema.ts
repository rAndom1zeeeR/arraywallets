import { z } from "zod";

import type { Asset } from "@/modules/omniston/demo/models/asset";
import { tonAddressSchema } from "@/modules/omniston/demo/lib/ton/address";
import { Chain } from "@/modules/omniston/demo/models/chain";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";

export const tonAssetSchema = z.object({
  kind: z.literal(["Ton", "Jetton", "Wton"] as const),
  contractAddress: tonAddressSchema,
  dexPriceUsd: z.coerce.number().optional(),
  meta: z.object({
    decimals: z.coerce.number(),
    symbol: z.string().optional(),
    displayName: z.string().optional(),
    imageUrl: z.url().optional(),
  }),
  walletAddress: z.string().optional(),
  balance: z.coerce.bigint().optional(),
});

export type TonAsset = z.infer<typeof tonAssetSchema>;

export function transformToAsset(tonAsset: TonAsset): Asset {
  const jettonAddress =
    tonAsset.kind === "Ton"
      ? undefined
      : (() => {
          try {
            return normalizeWalletAddress(tonAsset.contractAddress);
          } catch {
            return tonAsset.contractAddress;
          }
        })();

  return {
    id: {
      chain: {
        $case: Chain.TON,
        value: {
          kind:
            tonAsset.kind === "Ton"
              ? { $case: "native", value: {} }
              : { $case: "jetton", value: jettonAddress! },
        },
      },
    },
    metadata: tonAsset.meta,
    balance: tonAsset.balance,
    priceUsd: tonAsset.dexPriceUsd,
    extra: {},
  };
}
