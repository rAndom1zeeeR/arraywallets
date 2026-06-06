import type { ChainTabConfig } from "@/modules/omniston/demo/components/AssetSelect";
import type { Chain } from "@/modules/omniston/demo/models/chain";

/**
 * Removes a chain tab from the asset picker (e.g. hide send chain on receive side).
 */
export function excludeChainFromConfigs(
  chainConfigs: [ChainTabConfig, ...ChainTabConfig[]],
  excludedChain: Chain | undefined,
): [ChainTabConfig, ...ChainTabConfig[]] {
  if (!excludedChain) {
    return chainConfigs;
  }

  const filtered = chainConfigs.filter((config) => config.chain !== excludedChain);

  if (filtered.length === 0) {
    return chainConfigs;
  }

  return filtered as [ChainTabConfig, ...ChainTabConfig[]];
}
