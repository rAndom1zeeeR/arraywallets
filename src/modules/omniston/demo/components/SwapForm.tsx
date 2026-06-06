"use client";

import { ArrowDownUp } from "lucide-react";
import { useMemo } from "react";
import { useConfig as useWagmiConfig } from "wagmi";

import { AssetSelect, type ChainTabConfig } from "@/modules/omniston/demo/components/AssetSelect";
import { SwapExchangeField } from "@/modules/omniston/demo/components/SwapExchangeField";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { Card, CardContent } from "@/modules/omniston/demo/components/ui/card";
import { useConnectedWallets } from "@/modules/omniston/demo/hooks/useConnectedWallets";
import { useSyncQuoteToSwapForm } from "@/modules/omniston/demo/hooks/useSyncQuoteToSwapForm";
import { excludeChainFromConfigs } from "@/modules/omniston/demo/lib/omniston/swap-chain-configs.utils";
import { getMaxTokenAmount } from "@/modules/omniston/demo/lib/omniston/swap-exchange.utils";
import { getTonUsdtAssetId } from "@/modules/omniston/demo/lib/omniston/swap-form-mode.utils";
import { cn } from "@/modules/omniston/demo/lib/utils";
import { Chain } from "@/modules/omniston/demo/models/chain";
import { useAssets } from "@/modules/omniston/demo/providers/assets";
import { useSwapForm, useSwapFormDispatch } from "@/modules/omniston/demo/providers/swap-form";
import { tonAssetQueryFactory } from "@/modules/omniston/demo/queries/ton-assets";
import { baseAssetQueryFactory } from "@/modules/omniston/demo/queries/base-assets";
import { polygonAssetQueryFactory } from "@/modules/omniston/demo/queries/polygon-assets";
import { ethereumAssetQueryFactory } from "@/modules/omniston/demo/queries/ethereum-assets";
import { bnbAssetQueryFactory } from "@/modules/omniston/demo/queries/bnb-assets";
import {
  getOmnistonSupportedAssetIdForChain,
  isOmnistonSupportedAssetId,
} from "@/modules/omniston/omniston-supported-assets.constants";
import { AssetPickerFieldProvider } from "@/modules/omniston/demo/providers/asset-picker-field.context";
import { OmnistonModeTabs } from "@/modules/omniston/presentation/components/OmnistonModeTabs";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { useOmnistonMode } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";

const OMNISTON_TRANSFER_ASSET_EMPTY_MESSAGE =
  "Only USD stablecoins are supported for cross-chain transfers on this network.";

const validateFloatValue = (value: string): boolean =>
  /^([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(value);

const useTransferChainConfigs = (): [ChainTabConfig, ...ChainTabConfig[]] => {
  const {
    ton: tonWalletAddress,
    base: baseWalletAddress,
    polygon: polygonWalletAddress,
    ethereum: ethereumWalletAddress,
    bnb: bnbWalletAddress,
  } = useConnectedWallets();

  const wagmiConfig = useWagmiConfig();
  const tonUsdAssetId = getOmnistonSupportedAssetIdForChain(Chain.TON);
  const tonUnconditionalAssets = tonUsdAssetId ? [tonUsdAssetId] : [];

  return [
    {
      chain: Chain.TON,
      fetchQueryOptions: tonAssetQueryFactory.fetch({
        walletAddress: tonWalletAddress,
        unconditionalAssets: tonUnconditionalAssets,
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        tonAssetQueryFactory.search({
          searchTerms,
          walletAddress: tonWalletAddress,
          unconditionalAssets: tonUnconditionalAssets,
        }) as ChainTabConfig["fetchQueryOptions"],
    },
    {
      chain: Chain.BASE,
      fetchQueryOptions: baseAssetQueryFactory.fetch({
        walletAddress: baseWalletAddress,
        wagmiConfig,
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        baseAssetQueryFactory.search({
          searchTerm: searchTerms[0] ?? "",
          walletAddress: baseWalletAddress,
          wagmiConfig,
        }) as ChainTabConfig["fetchQueryOptions"],
    },
    {
      chain: Chain.POLYGON,
      fetchQueryOptions: polygonAssetQueryFactory.fetch({
        walletAddress: polygonWalletAddress,
        wagmiConfig,
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        polygonAssetQueryFactory.search({
          searchTerm: searchTerms[0] ?? "",
          walletAddress: polygonWalletAddress,
          wagmiConfig,
        }) as ChainTabConfig["fetchQueryOptions"],
    },
    {
      chain: Chain.ETHEREUM,
      fetchQueryOptions: ethereumAssetQueryFactory.fetch({
        walletAddress: ethereumWalletAddress,
        wagmiConfig,
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        ethereumAssetQueryFactory.search({
          searchTerm: searchTerms[0] ?? "",
          walletAddress: ethereumWalletAddress,
          wagmiConfig,
        }) as ChainTabConfig["fetchQueryOptions"],
    },
    {
      chain: Chain.BNB,
      fetchQueryOptions: bnbAssetQueryFactory.fetch({
        walletAddress: bnbWalletAddress,
        wagmiConfig,
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        bnbAssetQueryFactory.search({
          searchTerm: searchTerms[0] ?? "",
          walletAddress: bnbWalletAddress,
          wagmiConfig,
        }) as ChainTabConfig["fetchQueryOptions"],
    },
  ];
};

const useTonSwapChainConfigs = (): [ChainTabConfig, ...ChainTabConfig[]] => {
  const { ton: tonWalletAddress } = useConnectedWallets();
  const tonUsdtAssetId = getTonUsdtAssetId();

  return [
    {
      chain: Chain.TON,
      fetchQueryOptions: tonAssetQueryFactory.fetch({
        walletAddress: tonWalletAddress,
        unconditionalAssets: [tonUsdtAssetId],
      }) as ChainTabConfig["fetchQueryOptions"],
      searchQueryOptions: (searchTerms) =>
        tonAssetQueryFactory.search({
          searchTerms,
          walletAddress: tonWalletAddress,
          unconditionalAssets: [tonUsdtAssetId],
        }) as ChainTabConfig["fetchQueryOptions"],
    },
  ];
};

interface SwapFormProps {
  className?: string;
  hideModeTabs?: boolean;
}

export const SwapForm = (props: SwapFormProps) => {
  useSyncQuoteToSwapForm();

  const { mode } = useOmnistonMode();
  const isTransferMode = mode === OmnistonMode.TRANSFER;

  return (
    <Card {...props} className={cn("overflow-hidden border-border/50 bg-card/80", props.className)}>
      <CardContent className="flex flex-col gap-3 p-3 sm:p-4">
        {!props.hideModeTabs ? <OmnistonModeTabs /> : null}

        <AssetPickerFieldProvider>
          <div className="flex flex-col gap-1">
            <FromExchangeField />

            <div className="relative z-10 -my-2 flex justify-center">
              <FlipAssetsButton />
            </div>

            <ToExchangeField showCustomAddressToggle={isTransferMode} />
          </div>
        </AssetPickerFieldProvider>
      </CardContent>
    </Card>
  );
};

const FlipAssetsButton = () => {
  const dispatch = useSwapFormDispatch();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Flip send and receive assets"
      className="size-8 rounded-full border-border/60 bg-background shadow-sm sm:size-9"
      onClick={() => dispatch({ type: "FLIP_ASSETS" })}
    >
      <ArrowDownUp className="size-4" aria-hidden />
    </Button>
  );
};

const FromExchangeField = () => {
  const { mode } = useOmnistonMode();
  const { inputAssetId, outputAssetId, inputUnits } = useSwapForm();
  const dispatch = useSwapFormDispatch();
  const { getAssetById } = useAssets();

  const transferChainConfigs = useTransferChainConfigs();
  const tonChainConfigs = useTonSwapChainConfigs();
  const excludedChain = outputAssetId?.chain.$case as Chain | undefined;

  const inputChainConfigs = useMemo(() => {
    if (mode === OmnistonMode.SWAP) {
      return tonChainConfigs;
    }

    return excludeChainFromConfigs(transferChainConfigs, excludedChain);
  }, [mode, tonChainConfigs, transferChainConfigs, excludedChain]);

  const inputAsset = inputAssetId ? (getAssetById(inputAssetId) ?? null) : null;
  const outputAsset = outputAssetId ? (getAssetById(outputAssetId) ?? null) : null;
  const inputChain = inputAssetId?.chain.$case as Chain | undefined;

  const handleUnitsChange = (value: string) => {
    if (value && !validateFloatValue(value)) {
      return;
    }

    dispatch({ type: "SET_INPUT_UNITS", payload: value });
  };

  const handleMaxClick = () => {
    const maxAmount = getMaxTokenAmount(inputAsset);

    if (maxAmount) {
      dispatch({ type: "SET_INPUT_UNITS", payload: maxAmount });
    }
  };

  return (
    <SwapExchangeField
      side="from"
      chain={inputChain}
      asset={inputAsset}
      units={inputUnits}
      onUnitsChange={handleUnitsChange}
      onMaxClick={handleMaxClick}
      assetSelect={
        <AssetSelect
          key={mode === OmnistonMode.SWAP ? "swap-input" : `transfer-input-${excludedChain ?? "none"}`}
          presentation="inline"
          pickerSide="from"
          fieldLabel="From"
          allowContractSearch={mode === OmnistonMode.SWAP}
          showSearch={mode === OmnistonMode.SWAP}
          chains={inputChainConfigs}
          selectedAsset={inputAsset}
          excludeAsset={mode === OmnistonMode.SWAP ? outputAsset : undefined}
          assetFilter={
            mode === OmnistonMode.TRANSFER
              ? (asset) => isOmnistonSupportedAssetId(asset.id)
              : undefined
          }
          emptyMessage={
            mode === OmnistonMode.TRANSFER ? OMNISTON_TRANSFER_ASSET_EMPTY_MESSAGE : undefined
          }
          onAssetSelect={(asset) => dispatch({ type: "SET_INPUT_ASSET_ID", payload: asset })}
        />
      }
    />
  );
};

const ToExchangeField = ({ showCustomAddressToggle }: { showCustomAddressToggle: boolean }) => {
  const { mode } = useOmnistonMode();
  const { outputAssetId, inputAssetId, outputUnits, inputUnits } = useSwapForm();
  const dispatch = useSwapFormDispatch();
  const { getAssetById } = useAssets();

  const transferChainConfigs = useTransferChainConfigs();
  const tonChainConfigs = useTonSwapChainConfigs();
  const excludedChain = inputAssetId?.chain.$case as Chain | undefined;

  const inputAsset = inputAssetId ? (getAssetById(inputAssetId) ?? null) : null;
  const outputAsset = outputAssetId ? (getAssetById(outputAssetId) ?? null) : null;
  const outputChain = outputAssetId?.chain.$case as Chain | undefined;

  const outputChainConfigs = useMemo(() => {
    if (mode === OmnistonMode.SWAP) {
      return tonChainConfigs;
    }

    return excludeChainFromConfigs(transferChainConfigs, excludedChain);
  }, [mode, tonChainConfigs, transferChainConfigs, excludedChain]);

  const handleUnitsChange = (value: string) => {
    if (value && !validateFloatValue(value)) {
      return;
    }

    dispatch({ type: "SET_OUTPUT_UNITS", payload: value });
  };

  return (
    <SwapExchangeField
      side="to"
      chain={outputChain}
      asset={outputAsset}
      units={outputUnits}
      onUnitsChange={handleUnitsChange}
      showCustomAddressToggle={showCustomAddressToggle}
      amountEditable={!inputUnits}
      assetSelect={
        <AssetSelect
          key={
            mode === OmnistonMode.SWAP ? "swap-output" : `transfer-output-${excludedChain ?? "none"}`
          }
          presentation="inline"
          pickerSide="to"
          fieldLabel="To"
          allowContractSearch={mode === OmnistonMode.SWAP}
          showSearch={mode === OmnistonMode.SWAP}
          chains={outputChainConfigs}
          selectedAsset={outputAsset}
          excludeAsset={mode === OmnistonMode.SWAP ? inputAsset : undefined}
          assetFilter={
            mode === OmnistonMode.TRANSFER
              ? (asset) => isOmnistonSupportedAssetId(asset.id)
              : undefined
          }
          emptyMessage={
            mode === OmnistonMode.TRANSFER ? OMNISTON_TRANSFER_ASSET_EMPTY_MESSAGE : undefined
          }
          onAssetSelect={(asset) => dispatch({ type: "SET_OUTPUT_ASSET_ID", payload: asset })}
        />
      }
    />
  );
};
