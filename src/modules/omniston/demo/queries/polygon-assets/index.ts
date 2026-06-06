import { polygon } from "@reown/appkit/networks";

import type { Asset } from "@/modules/omniston/demo/models/asset";
import { Chain } from "@/modules/omniston/demo/models/chain";
import {
  createEvmAssetQueryFactory,
  resolveEvmAssetsMock,
  type EvmAssetMock,
} from "@/modules/omniston/demo/queries/evm-asset-factory";
import { memoizePromise } from "@/modules/omniston/demo/lib/utils/promise";

import POLYGON_ASSETS_MOCK from "./polygon-assets-mock.json";

const POLYGON_ASSETS_QUERY_KEY = "polygon-assets";
const POLYGON_ASSETS_SEARCH_QUERY_KEY = "polygon-assets-search";

export const polygonAssetQueryFactory = createEvmAssetQueryFactory({
  chain: Chain.POLYGON,
  wagmiChainId: polygon.id,
  queryKey: POLYGON_ASSETS_QUERY_KEY,
  searchQueryKey: POLYGON_ASSETS_SEARCH_QUERY_KEY,
  getAssets: memoizePromise(async () =>
    (await resolveEvmAssetsMock(Chain.POLYGON, POLYGON_ASSETS_MOCK)).map(transformToAsset),
  ),
});

function transformToAsset(polygonAsset: EvmAssetMock): Asset {
  return {
    id: {
      chain: {
        $case: Chain.POLYGON,
        value: {
          kind:
            polygonAsset.address === "native"
              ? { $case: "native", value: {} }
              : { $case: "erc20", value: polygonAsset.address },
        },
      },
    },
    metadata: polygonAsset.metadata,
    balance: polygonAsset.balance,
    extra: {},
  };
}
