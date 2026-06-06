import type { AssetInfoV2 } from "@ston-fi/api";
import type { AssetId } from "@ston-fi/omniston-sdk-react";

/**
 * Maps a STON.fi API asset row to an Omniston {@link AssetId}.
 */
export function mapStonAssetToOmnistonAssetId(asset: AssetInfoV2): AssetId | null {
  if (asset.kind === "Ton") {
    return {
      chain: {
        $case: "ton",
        value: {
          kind: {
            $case: "native",
            value: {},
          },
        },
      },
    };
  }

  if (asset.kind === "Jetton" || asset.kind === "Wton") {
    if (!asset.contractAddress) {
      return null;
    }

    return {
      chain: {
        $case: "ton",
        value: {
          kind: {
            $case: "jetton",
            value: asset.contractAddress,
          },
        },
      },
    };
  }

  return null;
}

/**
 * Human-readable label for a STON.fi asset row.
 */
export function getStonAssetLabel(asset: AssetInfoV2): string {
  return asset.meta?.symbol ?? asset.meta?.displayName ?? asset.contractAddress.slice(0, 8);
}
