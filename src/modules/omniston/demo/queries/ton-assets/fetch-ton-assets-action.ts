"use server";

import type { Asset } from "@/modules/omniston/demo/models/asset";

import { stonApiClient } from "@/modules/omniston/demo/lib/ston-api-client";
import { withStonApiRetry } from "@/modules/omniston/demo/lib/ston-api-retry";
import { tonAssetSchema, transformToAsset } from "./ton-asset-schema";

const ASSET_QUERY_CONDITION =
  process.env.OMNIDEMO__STON_API__ASSETS_QUERY_CONDITION ??
  "(asset:liquidity:high | asset:liquidity:very_high | asset:essential | asset:wallet_has_balance) & !(asset:blacklisted | asset:deprecated)";

export async function fetchTonAssets({
  condition,
  unconditionalAssets,
  walletAddress,
}: {
  condition?: string;
  unconditionalAssets?: string[];
  walletAddress?: string;
}): Promise<Asset[]> {
  const response = await withStonApiRetry(() =>
    stonApiClient.queryAssets({
      condition: condition ? `${ASSET_QUERY_CONDITION} & ${condition}` : ASSET_QUERY_CONDITION,
      walletAddress,
      unconditionalAssets,
    }),
  );

  const assets = response.reduce<Asset[]>((acc, asset) => {
    const parsedData = tonAssetSchema.safeParse(asset);

    if (parsedData.success) {
      acc.push(transformToAsset(parsedData.data));
    }

    return acc;
  }, []);

  return assets;
}
