"use server";

import { type Asset } from "@/modules/omniston/demo/models/asset";
import { stonApiClient } from "@/modules/omniston/demo/lib/ston-api-client";
import { withStonApiRetry } from "@/modules/omniston/demo/lib/ston-api-retry";
import { tonAssetSchema, transformToAsset } from "./ton-asset-schema";

const ASSET_SEARCH_CONDITION =
  process.env.OMNIDEMO__STON_API__ASSETS_SEARCH_CONDITION ??
  "asset:wallet_has_balance | asset:default_symbol | !(asset:blacklisted | asset:liquidity:no)";

export async function searchTonAssets({
  searchTerms,
  condition,
  unconditionalAssets,
  walletAddress,
  limit = 50,
}: {
  searchTerms: string[];
  condition?: string;
  unconditionalAssets?: string[];
  walletAddress?: string;
  limit?: number;
}): Promise<Asset[]> {
  const response = await withStonApiRetry(() =>
    stonApiClient.queryAssets({
      limit,
      searchTerms,
      condition: condition ? `${ASSET_SEARCH_CONDITION} & ${condition}` : ASSET_SEARCH_CONDITION,
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
