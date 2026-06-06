import { base } from "@reown/appkit/networks";

import type { Asset } from "@/modules/omniston/demo/models/asset";
import { Chain } from "@/modules/omniston/demo/models/chain";
import {
  createEvmAssetQueryFactory,
  resolveEvmAssetsMock,
  type EvmAssetMock,
} from "@/modules/omniston/demo/queries/evm-asset-factory";
import { memoizePromise } from "@/modules/omniston/demo/lib/utils/promise";

import BASE_ASSETS_MOCK from "./base-assets-mock.json";

const BASE_ASSETS_QUERY_KEY = "base-assets";
const BASE_ASSETS_SEARCH_QUERY_KEY = "base-assets-search";

export const baseAssetQueryFactory = createEvmAssetQueryFactory({
  chain: Chain.BASE,
  wagmiChainId: base.id,
  queryKey: BASE_ASSETS_QUERY_KEY,
  searchQueryKey: BASE_ASSETS_SEARCH_QUERY_KEY,
  getAssets: memoizePromise(async () =>
    (await resolveEvmAssetsMock(Chain.BASE, BASE_ASSETS_MOCK)).map(transformToAsset),
  ),
});

function transformToAsset(baseAsset: EvmAssetMock): Asset {
  return {
    id: {
      chain: {
        $case: Chain.BASE,
        value: {
          kind:
            baseAsset.address === "native"
              ? { $case: "native", value: {} }
              : { $case: "erc20", value: baseAsset.address },
        },
      },
    },
    metadata: baseAsset.metadata,
    balance: baseAsset.balance,
    extra: {},
  };
}
