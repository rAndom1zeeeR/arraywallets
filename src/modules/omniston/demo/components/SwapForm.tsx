"use client";

import { useConfig as useWagmiConfig } from "wagmi";

import { AssetSelect, type ChainTabConfig } from "@/modules/omniston/demo/components/AssetSelect";
import { Card, CardContent } from "@/modules/omniston/demo/components/ui/card";
import { Input } from "@/modules/omniston/demo/components/ui/input";
import { cn } from "@/modules/omniston/demo/lib/utils";
import { Chain } from "@/modules/omniston/demo/models/chain";
import { useSwapForm, useSwapFormDispatch } from "@/modules/omniston/demo/providers/swap-form";
import { tonAssetQueryFactory } from "@/modules/omniston/demo/queries/ton-assets";
import { baseAssetQueryFactory } from "@/modules/omniston/demo/queries/base-assets";
import { polygonAssetQueryFactory } from "@/modules/omniston/demo/queries/polygon-assets";
import { ethereumAssetQueryFactory } from "@/modules/omniston/demo/queries/ethereum-assets";
import { bnbAssetQueryFactory } from "@/modules/omniston/demo/queries/bnb-assets";
import { useAssets } from "@/modules/omniston/demo/providers/assets";
import { useConnectedWallets } from "@/modules/omniston/demo/hooks/useConnectedWallets";

const useChainConfigs = (): [ChainTabConfig, ...ChainTabConfig[]] => {
  const {
    ton: tonWalletAddress,
    base: baseWalletAddress,
    polygon: polygonWalletAddress,
    ethereum: ethereumWalletAddress,
    bnb: bnbWalletAddress,
  } = useConnectedWallets();

  const wagmiConfig = useWagmiConfig();

  return [
    {
      chain: Chain.TON,
      fetchQueryOptions: tonAssetQueryFactory.fetch({
        walletAddress: tonWalletAddress,
      }),
      searchQueryOptions: (searchTerm) =>
        tonAssetQueryFactory.search({
          searchTerms: [searchTerm],
          walletAddress: tonWalletAddress,
        }),
    },
    {
      chain: Chain.BASE,
      fetchQueryOptions: baseAssetQueryFactory.fetch({
        walletAddress: baseWalletAddress,
        wagmiConfig,
      }),
      searchQueryOptions: (searchTerm) =>
        baseAssetQueryFactory.search({
          searchTerm,
          walletAddress: baseWalletAddress,
          wagmiConfig,
        }),
    },
    {
      chain: Chain.POLYGON,
      fetchQueryOptions: polygonAssetQueryFactory.fetch({
        walletAddress: polygonWalletAddress,
        wagmiConfig,
      }),
      searchQueryOptions: (searchTerm) =>
        polygonAssetQueryFactory.search({
          searchTerm,
          walletAddress: polygonWalletAddress,
          wagmiConfig,
        }),
    },
    {
      chain: Chain.ETHEREUM,
      fetchQueryOptions: ethereumAssetQueryFactory.fetch({
        walletAddress: ethereumWalletAddress,
        wagmiConfig,
      }),
      searchQueryOptions: (searchTerm) =>
        ethereumAssetQueryFactory.search({
          searchTerm,
          walletAddress: ethereumWalletAddress,
          wagmiConfig,
        }),
    },
    {
      chain: Chain.BNB,
      fetchQueryOptions: bnbAssetQueryFactory.fetch({
        walletAddress: bnbWalletAddress,
        wagmiConfig,
      }),
      searchQueryOptions: (searchTerm) =>
        bnbAssetQueryFactory.search({
          searchTerm,
          walletAddress: bnbWalletAddress,
          wagmiConfig,
        }),
    },
  ];
};

export const SwapForm = (props: { className?: string }) => {
  return (
    <Card {...props}>
      <CardContent className="flex flex-col gap-4 p-6">
        <section>
          <InputAssetHeader className="mb-1" />
          <div className="flex gap-2">
            <InputAssetSelect className="w-1/3" />
            <InputAssetInput className="flex-1" />
          </div>
        </section>

        <section className="flex flex-col gap-1">
          <OutputAssetHeader />
          <div className="flex gap-2">
            <OutputAssetSelect className="w-1/3" />
            <OutputAssetInput className="flex-1" />
          </div>
        </section>
      </CardContent>
    </Card>
  );
};

const validateFloatValue = (value: string): boolean =>
  /^([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(value);

const InputAssetHeader = (props: { className?: string }) => {
  return (
    <div
      {...props}
      className={cn(
        "flex items-center justify-between gap-2 text-sm text-muted-foreground",
        props.className,
      )}
    >
      You send
    </div>
  );
};

const InputAssetSelect = (props: { className?: string }) => {
  const { inputAssetId } = useSwapForm();
  const dispatch = useSwapFormDispatch();
  const { getAssetById } = useAssets();
  const chainConfigs = useChainConfigs();

  const inputAsset = inputAssetId ? (getAssetById(inputAssetId) ?? null) : null;

  return (
    <AssetSelect
      {...props}
      chains={chainConfigs}
      selectedAsset={inputAsset}
      onAssetSelect={(asset) => dispatch({ type: "SET_INPUT_ASSET_ID", payload: asset })}
    />
  );
};

const InputAssetInput = (props: { className?: string }) => {
  const { inputAssetId, inputUnits } = useSwapForm();
  const dispatch = useSwapFormDispatch();

  const handleInputUpdate = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    if (target.value && !validateFloatValue(target.value)) return;

    dispatch({ type: "SET_INPUT_UNITS", payload: target.value });
  };

  return (
    <Input {...props} disabled={!inputAssetId} value={inputUnits} onChange={handleInputUpdate} />
  );
};

const OutputAssetHeader = (props: { className?: string }) => {
  return (
    <div
      {...props}
      className={cn(
        "flex items-center justify-between gap-2 text-sm text-muted-foreground",
        props.className,
      )}
    >
      You receive
    </div>
  );
};

const OutputAssetSelect = (props: { className?: string }) => {
  const { outputAssetId, inputAssetId } = useSwapForm();
  const dispatch = useSwapFormDispatch();
  const { getAssetById } = useAssets();
  const chainConfigs = useChainConfigs();

  const inputAsset = inputAssetId ? (getAssetById(inputAssetId) ?? null) : null;
  const outputAsset = outputAssetId ? (getAssetById(outputAssetId) ?? null) : null;

  return (
    <AssetSelect
      {...props}
      chains={chainConfigs}
      selectedAsset={outputAsset}
      excludeAsset={inputAsset}
      onAssetSelect={(asset) => dispatch({ type: "SET_OUTPUT_ASSET_ID", payload: asset })}
    />
  );
};

const OutputAssetInput = (props: { className?: string }) => {
  const { outputAssetId, outputUnits } = useSwapForm();
  const dispatch = useSwapFormDispatch();

  const handleInputUpdate = ({ target }: React.ChangeEvent<HTMLInputElement>) => {
    if (target.value && !validateFloatValue(target.value)) return;

    dispatch({ type: "SET_OUTPUT_UNITS", payload: target.value });
  };

  return (
    <Input {...props} disabled={!outputAssetId} value={outputUnits} onChange={handleInputUpdate} />
  );
};
