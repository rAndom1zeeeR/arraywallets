import type { AssetId } from "@ston-fi/omniston-sdk-react";

import { Chain } from "@/modules/omniston/demo/models/chain";
import { isAssetIdEqual } from "@/modules/omniston/demo/models/asset-id";
import type { Asset } from "@/modules/omniston/demo/models/asset";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";

/** Canonical Tether USD jetton master on TON (USD₮, 6 decimals). */
const TON_USDT_JETTON_ADDRESS = normalizeWalletAddress(
  "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
);

const BASE_USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const POLYGON_PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const ETHEREUM_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const BNB_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

export interface OmnistonSupportedAsset {
  chain: Chain;
  symbol: string;
  label: string;
  assetId: AssetId;
}

/**
 * Cross-chain Omniston routes currently support USD stablecoins only (one per chain).
 * @see https://omniston.ston.fi/
 */
export const OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS: readonly OmnistonSupportedAsset[] = [
  {
    chain: Chain.TON,
    symbol: "USD₮",
    label: "USD₮ on TON",
    assetId: {
      chain: {
        $case: Chain.TON,
        value: { kind: { $case: "jetton", value: TON_USDT_JETTON_ADDRESS } },
      },
    },
  },
  {
    chain: Chain.BASE,
    symbol: "USDC",
    label: "USDC on Base",
    assetId: {
      chain: {
        $case: Chain.BASE,
        value: { kind: { $case: "erc20", value: BASE_USDC_ADDRESS } },
      },
    },
  },
  {
    chain: Chain.POLYGON,
    symbol: "pUSD",
    label: "pUSD on Polygon",
    assetId: {
      chain: {
        $case: Chain.POLYGON,
        value: { kind: { $case: "erc20", value: POLYGON_PUSD_ADDRESS } },
      },
    },
  },
  {
    chain: Chain.ETHEREUM,
    symbol: "USD₮",
    label: "USD₮ on Ethereum",
    assetId: {
      chain: {
        $case: Chain.ETHEREUM,
        value: { kind: { $case: "erc20", value: ETHEREUM_USDT_ADDRESS } },
      },
    },
  },
  {
    chain: Chain.BNB,
    symbol: "USD₮",
    label: "USD₮ on BNB Chain",
    assetId: {
      chain: {
        $case: Chain.BNB,
        value: { kind: { $case: "erc20", value: BNB_USDT_ADDRESS } },
      },
    },
  },
] as const;

export const OMNISTON_SUPPORTED_ASSET_IDS: AssetId[] = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.map(
  (asset) => asset.assetId,
);

export const OMNISTON_DEFAULT_INPUT_ASSET_ID = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS[0].assetId;
export const OMNISTON_DEFAULT_OUTPUT_ASSET_ID = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS[1].assetId;

export const OMNISTON_SUPPORTED_ASSETS_SUMMARY = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.map(
  (asset) => asset.label,
).join(" · ");

/** Whether the asset is in the current Omniston cross-chain allowlist. */
export function isOmnistonSupportedAssetId(assetId: AssetId | null | undefined): boolean {
  if (!assetId) {
    return false;
  }

  return OMNISTON_SUPPORTED_ASSET_IDS.some((supportedId) => isAssetIdEqual(supportedId, assetId));
}

/** Keeps only Omniston-supported assets (e.g. after ston.fi or wallet balance fetch). */
export function filterOmnistonSupportedAssets(assets: Asset[]): Asset[] {
  return assets.filter((asset) => isOmnistonSupportedAssetId(asset.id));
}

/** Supported asset for a chain, if any. */
export function getOmnistonSupportedAssetIdForChain(chain: Chain): AssetId | undefined {
  return OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.find((asset) => asset.chain === chain)?.assetId;
}

/** Default receive asset on a chain other than the send chain. */
export function getOmnistonDefaultOutputAssetIdForInput(
  inputAssetId: AssetId | null | undefined,
): AssetId {
  const inputChain = inputAssetId?.chain.$case;
  const alternative = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.find(
    (asset) => asset.chain !== inputChain,
  );

  return alternative?.assetId ?? OMNISTON_DEFAULT_OUTPUT_ASSET_ID;
}

/** Default send asset on a chain other than the receive chain. */
export function getOmnistonDefaultInputAssetIdForOutput(
  outputAssetId: AssetId | null | undefined,
): AssetId {
  const outputChain = outputAssetId?.chain.$case;
  const alternative = OMNISTON_SUPPORTED_CROSS_CHAIN_ASSETS.find(
    (asset) => asset.chain !== outputChain,
  );

  return alternative?.assetId ?? OMNISTON_DEFAULT_INPUT_ASSET_ID;
}
