"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/modules/omniston/demo/components/ui/avatar";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/omniston/demo/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/modules/omniston/demo/components/ui/popover";
import { Skeleton } from "@/modules/omniston/demo/components/ui/skeleton";
import { useDebounce } from "@/modules/omniston/demo/hooks/useDebounce";
import { buildAssetSearchTerms } from "@/modules/omniston/demo/lib/omniston/asset-select-search.utils";
import { getAssetListValueLabels } from "@/modules/omniston/demo/lib/omniston/swap-exchange.utils";
import { bigNumberToFloat, cn } from "@/modules/omniston/demo/lib/utils";
import type { Asset } from "@/modules/omniston/demo/models/asset";
import { isAssetIdEqual, deserializeAssetId, serializeAssetId } from "@/modules/omniston/demo/models/asset-id";
import { truncateAddress, addressFromAssetId } from "@/modules/omniston/demo/models/address";
import { SwapExchangeAssetTrigger } from "@/modules/omniston/demo/components/SwapExchangeField";
import {
  type AssetPickerFieldSide,
  useAssetPickerField,
} from "@/modules/omniston/demo/providers/asset-picker-field.context";
import { ExplorerAddressPreview } from "./ExplorerAddressPreview";
import { CHAIN_METADATA, Chain, chainSchema, isEvmChain } from "@/modules/omniston/demo/models/chain";
import { useAssets } from "@/modules/omniston/demo/providers/assets";

export type AssetSelectTriggerVariant = "default" | "exchange";
export type AssetSelectPresentation = "popover" | "inline";

interface AssetListQueryConfig {
  queryKey: unknown;
  queryFn: () => Promise<Asset[]>;
  enabled?: boolean;
  retry?: number | boolean;
  retryDelay?: number | ((attemptIndex: number) => number);
}

export type ChainTabConfig = {
  chain: Chain;
  fetchQueryOptions: AssetListQueryConfig;
  searchQueryOptions?: (searchTerms: string[]) => AssetListQueryConfig;
};

type AssetSelectProps = {
  chains: [ChainTabConfig, ...ChainTabConfig[]];
  selectedAsset: Asset | null;
  excludeAsset?: Asset | null;
  assetFilter?: (asset: Asset) => boolean;
  emptyMessage?: string;
  onAssetSelect?: (id: Asset["id"] | null) => void;
  className?: string;
  triggerVariant?: AssetSelectTriggerVariant;
  fieldLabel?: string;
  presentation?: AssetSelectPresentation;
  pickerSide?: AssetPickerFieldSide;
  searchPlaceholder?: string;
  allowContractSearch?: boolean;
  showSearch?: boolean;
};

export const AssetSelect = ({
  chains,
  selectedAsset,
  excludeAsset,
  assetFilter,
  emptyMessage = "No asset found.",
  onAssetSelect,
  className,
  triggerVariant = "default",
  fieldLabel,
  presentation = "popover",
  pickerSide,
  searchPlaceholder,
  allowContractSearch = false,
  showSearch = true,
}: AssetSelectProps) => {
  const { insertAsset } = useAssets();
  const pickerField = useAssetPickerField(pickerSide);

  const defaultChain = chains[0];
  const isInline = presentation === "inline";
  const open = isInline ? Boolean(pickerField?.isOpen) : undefined;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const resolvedOpen = isInline ? open : popoverOpen;

  const setResolvedOpen = (nextOpen: boolean) => {
    if (isInline) {
      pickerField?.setOpen(nextOpen);
      return;
    }

    setPopoverOpen(nextOpen);
  };

  useEffect(() => {
    if (resolvedOpen && showSearch && window.matchMedia("(pointer: fine)").matches) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [resolvedOpen, showSearch]);

  const [selectedChain, setSelectedChain] = useState<Chain>(() => {
    const parsedChain = chainSchema.safeParse(selectedAsset?.id.chain.$case);

    if (parsedChain.success) {
      return parsedChain.data;
    }

    return defaultChain.chain;
  });

  useEffect(() => {
    if (selectedAsset) {
      setSelectedChain(selectedAsset.id.chain.$case);
    }
  }, [selectedAsset]);

  useEffect(() => {
    if (!chains.some((config) => config.chain === selectedChain)) {
      setSelectedChain(defaultChain.chain);
    }
  }, [chains, selectedChain, defaultChain.chain]);

  useQueries({
    queries: chains.map((chain) => chain.fetchQueryOptions) as Parameters<typeof useQueries>[0]["queries"],
  });

  const activeConfig = chains.find(({ chain }) => chain === selectedChain) ?? defaultChain;

  const searchTerms = useMemo(() => {
    if (!showSearch || !debouncedSearchTerm) {
      return [];
    }

    return buildAssetSearchTerms(debouncedSearchTerm, {
      allowTonContract: allowContractSearch && selectedChain === Chain.TON,
      allowEvmContract: allowContractSearch && isEvmChain(selectedChain),
    });
  }, [allowContractSearch, debouncedSearchTerm, selectedChain, showSearch]);

  const fetchResult = useQuery(activeConfig.fetchQueryOptions as Parameters<typeof useQuery<Asset[]>>[0]);

  const querySearchTerms = searchTerms.length > 0 ? searchTerms : debouncedSearchTerm ? [debouncedSearchTerm] : [];

  const searchResult = useQuery({
    ...((activeConfig.searchQueryOptions?.(querySearchTerms) ?? {
      queryKey: ["__noop__"],
      queryFn: async () => [] as Asset[],
    }) as Parameters<typeof useQuery<Asset[]>>[0]),
    enabled: querySearchTerms.length > 0 && !!activeConfig.searchQueryOptions,
  });

  const rawAssets: Asset[] =
    searchTerms.length > 0 ? (searchResult.data ?? []) : (fetchResult.data ?? []);

  const displayAssets = rawAssets
    .filter((asset) => (assetFilter ? assetFilter(asset) : true))
    .filter((asset) => (excludeAsset ? !isAssetIdEqual(asset.id, excludeAsset.id) : true));

  const handleAssetSelect = (asset: Asset) => {
    insertAsset(asset);
    onAssetSelect?.(asset.id);
    setResolvedOpen(false);
    setSearchTerm("");
  };

  useEffect(() => {
    if (!resolvedOpen) {
      setSearchTerm("");
    }
  }, [resolvedOpen]);

  const isLoading =
    (querySearchTerms.length > 0 && searchResult.isLoading) ||
    (querySearchTerms.length === 0 && fetchResult.isLoading);

  const placeholder =
    searchPlaceholder ??
    (allowContractSearch
      ? "Search token or paste contract address"
      : "Search token and chain");

  const panel = (
    <AssetSelectPanel
      chains={chains}
      selectedChain={selectedChain}
      onChainSelect={setSelectedChain}
      searchInputRef={searchInputRef}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      searchPlaceholder={placeholder}
      presentation={presentation}
      showSearch={showSearch}
      onClose={() => setResolvedOpen(false)}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      searchError={querySearchTerms.length > 0 && searchResult.isError}
      displayAssets={displayAssets}
      selectedAsset={selectedAsset}
      onAssetSelect={handleAssetSelect}
    />
  );

  if (isInline) {
    if (!resolvedOpen) {
      return (
        <button
          type="button"
          className={cn("w-full text-left", className)}
          onClick={() => setResolvedOpen(true)}
          aria-expanded={false}
        >
          <SwapExchangeAssetTrigger
            fieldLabel={fieldLabel ?? "Asset"}
            selectedAsset={selectedAsset}
            className="w-full"
          />
        </button>
      );
    }

    return <div className={cn("w-full", className)}>{panel}</div>;
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <AssetSelectTrigger
          selectedAsset={selectedAsset}
          className={className}
          triggerVariant={triggerVariant}
          fieldLabel={fieldLabel}
        />
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0">{panel}</PopoverContent>
    </Popover>
  );
};

interface AssetSelectPanelProps {
  chains: ChainTabConfig[];
  selectedChain: Chain;
  onChainSelect: (chain: Chain) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  searchPlaceholder: string;
  presentation: AssetSelectPresentation;
  showSearch: boolean;
  onClose: () => void;
  isLoading: boolean;
  emptyMessage: string;
  searchError: boolean;
  displayAssets: Asset[];
  selectedAsset: Asset | null;
  onAssetSelect: (asset: Asset) => void;
}

const AssetSelectPanel = ({
  chains,
  selectedChain,
  onChainSelect,
  searchInputRef,
  searchTerm,
  onSearchTermChange,
  searchPlaceholder,
  presentation,
  showSearch,
  onClose,
  isLoading,
  emptyMessage,
  searchError,
  displayAssets,
  selectedAsset,
  onAssetSelect,
}: AssetSelectPanelProps) => {
  const isInline = presentation === "inline";

  const closePickerButton = (
    <button
      type="button"
      onClick={onClose}
      className="rounded-md p-1 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      aria-label="Close token list"
    >
      <ChevronUp className="size-4" aria-hidden />
    </button>
  );

  if (isInline) {
    return (
      <div className="flex flex-col gap-2">
        {showSearch ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              placeholder={searchPlaceholder}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label={searchPlaceholder}
            />
            {closePickerButton}
          </div>
        ) : null}

        {chains.length > 1 ? (
          <div className={cn("flex items-center gap-2", !showSearch && "justify-between")}>
            <BlockchainIconTabs
              chains={chains}
              selectedChain={selectedChain}
              onChainSelect={onChainSelect}
              className={showSearch ? undefined : "flex-1"}
            />
            {!showSearch ? closePickerButton : null}
          </div>
        ) : !showSearch ? (
          <div className="flex justify-end">{closePickerButton}</div>
        ) : null}

        <div className="max-h-64 overflow-y-auto rounded-xl border border-border/30">
          <InlineAssetList
            assets={displayAssets}
            selectedAsset={selectedAsset}
            isLoading={isLoading}
            emptyMessage={searchError ? "Error searching assets." : emptyMessage}
            onAssetSelect={onAssetSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {chains.length > 1 ? (
        <BlockchainTab
          className="border-b"
          chains={chains}
          selectedChain={selectedChain}
          onChainSelect={onChainSelect}
        />
      ) : null}

      <Command shouldFilter={false}>
        {showSearch ? (
          <CommandInput
            ref={searchInputRef}
            placeholder={searchPlaceholder}
            value={searchTerm}
            onValueChange={onSearchTermChange}
          />
        ) : null}
        <CommandList>
          {isLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          ) : null}
          {!isLoading && displayAssets.length === 0 ? (
            <CommandEmpty>{searchError ? "Error searching assets." : emptyMessage}</CommandEmpty>
          ) : null}
          <CommandGroup>
            {displayAssets.map((asset) => (
              <PopoverAssetRow
                key={serializeAssetId(asset.id)}
                asset={asset}
                onSelect={() => onAssetSelect(asset)}
              />
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </>
  );
};

interface InlineAssetListProps {
  assets: Asset[];
  selectedAsset: Asset | null;
  isLoading: boolean;
  emptyMessage: string;
  onAssetSelect: (asset: Asset) => void;
}

const InlineAssetList = ({
  assets,
  selectedAsset,
  isLoading,
  emptyMessage,
  onAssetSelect,
}: InlineAssetListProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-border/30 p-1">
      {assets.map((asset) => {
        const isSelected = selectedAsset ? isAssetIdEqual(asset.id, selectedAsset.id) : false;
        const chain = asset.id.chain.$case as Chain;
        const chainMeta = CHAIN_METADATA[chain];
        const { primary: valuePrimary, secondary: valueSecondary } = getAssetListValueLabels(asset);

        return (
          <li key={serializeAssetId(asset.id)}>
            <button
              type="button"
              onClick={() => onAssetSelect(asset)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors",
                isSelected ? "bg-primary/10" : "hover:bg-muted/40",
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="size-10 border border-border/40">
                  <AvatarImage
                    src={asset.metadata.imageUrl}
                    alt={asset.metadata.symbol ?? asset.metadata.displayName}
                  />
                  <AvatarFallback>{asset.metadata.symbol?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <Avatar className="absolute -bottom-0.5 -right-0.5 size-4 border-2 border-background">
                  <AvatarImage src={chainMeta.imageUrl} alt={chainMeta.label} />
                </Avatar>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{asset.metadata.symbol ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {asset.metadata.displayName ?? chainMeta.label}
                </p>
              </div>

              <div className="shrink-0 text-right text-sm tabular-nums">
                <p>{valuePrimary}</p>
                {valueSecondary ? (
                  <p className="text-xs text-muted-foreground">{valueSecondary}</p>
                ) : null}
              </div>

              {isSelected ? <Check className="size-4 shrink-0 text-primary" aria-hidden /> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const PopoverAssetRow = ({ asset, onSelect }: { asset: Asset; onSelect: () => void }) => {
  const assetAddress = addressFromAssetId(asset.id);

  return (
    <CommandItem
      className="flex gap-2"
      value={serializeAssetId(asset.id)}
      onSelect={onSelect}
    >
      <Avatar className="aspect-square size-7 shrink-0">
        <AvatarImage src={asset.metadata.imageUrl} alt={asset.metadata.displayName ?? asset.metadata.symbol} />
        <AvatarFallback>
          <Skeleton className="rounded-full" />
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-1">
          <span>{asset.metadata.symbol}</span>
          <span className="text-muted-foreground text-sm tabular-nums">
            {asset.balance ? bigNumberToFloat(asset.balance, asset.metadata.decimals) : null}
          </span>
        </div>
        {assetAddress ? (
          <ExplorerAddressPreview
            address={assetAddress}
            onClick={(event) => event.stopPropagation()}
            className="w-fit text-xs opacity-50 hover:opacity-100"
          >
            {truncateAddress(assetAddress)}
          </ExplorerAddressPreview>
        ) : null}
      </div>
    </CommandItem>
  );
};

interface AssetSelectTriggerProps extends Omit<React.ComponentProps<typeof Button>, "children"> {
  selectedAsset: Asset | null;
  triggerVariant?: AssetSelectTriggerVariant;
  fieldLabel?: string;
}

const AssetSelectTrigger = React.forwardRef<
  React.ComponentRef<typeof Button>,
  AssetSelectTriggerProps
>(function AssetSelectTrigger(
  { selectedAsset, className, triggerVariant = "default", fieldLabel, ...props },
  ref,
) {
  if (triggerVariant === "exchange") {
    return (
      <Button
        ref={ref}
        {...props}
        type="button"
        variant="ghost"
        role="combobox"
        className={cn(
          "h-auto w-full justify-start p-0 hover:bg-transparent data-[state=open]:bg-muted/30",
          className,
        )}
      >
        <SwapExchangeAssetTrigger
          fieldLabel={fieldLabel ?? "Asset"}
          selectedAsset={selectedAsset}
          className="w-full"
        />
      </Button>
    );
  }

  return (
    <Button
      ref={ref}
      {...props}
      variant="outline"
      role="combobox"
      className={cn("w-full justify-start group data-[state=open]:border-foreground/50", className)}
    >
      {selectedAsset ? (
        <>
          <Avatar className="mr-2 size-[20px] shrink-0">
            <AvatarImage src={selectedAsset.metadata.imageUrl} alt={selectedAsset.metadata.symbol} />
          </Avatar>
          <span className="truncate">{selectedAsset.metadata.symbol}</span>
        </>
      ) : (
        <span className="truncate">Select asset…</span>
      )}
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 opacity-50 transition-transform group-data-[state=open]:rotate-180" />
    </Button>
  );
});

interface BlockchainTabProps extends Omit<React.ComponentProps<"div">, "children"> {
  selectedChain: Chain;
  chains: ChainTabConfig[];
  onChainSelect: (chain: Chain) => void;
}

function BlockchainTab({ chains, selectedChain, onChainSelect, ...props }: BlockchainTabProps) {
  return (
    <div className={cn("flex flex-1", props.className)}>
      {chains.map(({ chain }) => {
        const { label, imageUrl } = CHAIN_METADATA[chain];

        return (
          <button
            key={chain}
            type="button"
            onClick={() => onChainSelect(chain)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              selectedChain === chain
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Avatar className="size-4 shrink-0">
              <AvatarImage src={imageUrl} alt={label} />
            </Avatar>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface BlockchainIconTabsProps {
  chains: ChainTabConfig[];
  selectedChain: Chain;
  onChainSelect: (chain: Chain) => void;
  className?: string;
}

function BlockchainIconTabs({
  chains,
  selectedChain,
  onChainSelect,
  className,
}: BlockchainIconTabsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {chains.map(({ chain }) => {
        const { label, imageUrl } = CHAIN_METADATA[chain];
        const isActive = selectedChain === chain;

        return (
          <button
            key={chain}
            type="button"
            title={label}
            onClick={() => onChainSelect(chain)}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isActive
                ? "border-primary bg-primary/10"
                : "border-border/50 bg-background/40 hover:border-border",
            )}
            aria-label={label}
            aria-pressed={isActive}
          >
            <Avatar className="size-6 rounded-lg">
              <AvatarImage src={imageUrl} alt={label} />
              <AvatarFallback className="rounded-lg text-[10px]">{label[0]}</AvatarFallback>
            </Avatar>
          </button>
        );
      })}
    </div>
  );
}
