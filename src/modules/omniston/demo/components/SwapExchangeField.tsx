"use client";

import { ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/modules/omniston/demo/components/ui/avatar";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { Switch } from "@/modules/omniston/demo/components/ui/switch";
import {
  formatAssetBalance,
  formatTokenAmountUsd,
  isAmountExceedingAssetBalance,
} from "@/modules/omniston/demo/lib/omniston/swap-exchange.utils";
import { cn } from "@/modules/omniston/demo/lib/utils";
import type { Asset } from "@/modules/omniston/demo/models/asset";
import { CHAIN_METADATA, type Chain } from "@/modules/omniston/demo/models/chain";
import {
  type AssetPickerFieldSide,
  useAssetPickerField,
} from "@/modules/omniston/demo/providers/asset-picker-field.context";

interface SwapExchangeFieldProps {
  side: AssetPickerFieldSide;
  chain?: Chain;
  asset: Asset | null;
  units: string;
  onUnitsChange: (value: string) => void;
  onMaxClick?: () => void;
  assetSelect: React.ReactNode;
  showCustomAddressToggle?: boolean;
  amountEditable?: boolean;
  className?: string;
}

const SIDE_LABEL = {
  from: "From",
  to: "To",
} as const;

export const SwapExchangeField = ({
  side,
  chain,
  asset,
  units,
  onUnitsChange,
  onMaxClick,
  assetSelect,
  showCustomAddressToggle = false,
  amountEditable = true,
  className,
}: SwapExchangeFieldProps) => {
  const { isOpen: isPickerOpen, isCompact, setOpen } = useAssetPickerField(side);
  const usdLabel = formatTokenAmountUsd(units, asset);
  const balanceLabel = formatAssetBalance(asset);
  const canMax = Boolean(onMaxClick && asset?.balance && asset.balance > 0n);
  const exceedsBalance = side === "from" && isAmountExceedingAssetBalance(units, asset);

  if (isCompact) {
    return (
      <CompactExchangeField
        side={side}
        asset={asset}
        chain={chain}
        className={className}
        onOpen={() => setOpen(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-muted/25 px-3 pb-3 pt-4 sm:rounded-[20px] sm:px-4 sm:pb-4 sm:pt-5",
        className,
      )}
    >
      {/* {showCustomAddressToggle && !isPickerOpen ? (
        <div className="mb-3 flex items-center justify-end gap-2 pr-1 pt-0.5">
          <span className="text-xs text-muted-foreground">Custom Address</span>
          <Switch disabled aria-label="Use custom receive address" />
        </div>
      ) : null} */}

      <div className="mt-1">{assetSelect}</div>

      {!isPickerOpen ? (
        <>
          <div className="mt-3 flex items-center gap-2 sm:mt-4 sm:gap-3">
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              disabled={!asset || !amountEditable}
              value={units}
              onChange={(event) => onUnitsChange(event.target.value)}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-[1.625rem] font-normal leading-none tracking-tight text-foreground sm:text-[2rem]",
                "placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                "tabular-nums",
                exceedsBalance && "text-destructive",
              )}
              aria-label={`${SIDE_LABEL[side]} amount`}
              aria-invalid={exceedsBalance}
            />

            {side === "from" && onMaxClick ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={!canMax}
                onClick={onMaxClick}
                className="h-8 shrink-0 rounded-full px-3 text-xs font-medium"
              >
                Max
              </Button>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground sm:mt-3 sm:gap-3 sm:text-sm">
            <span className="shrink-0 tabular-nums">{usdLabel}</span>
            <span
              className={cn(
                "min-w-0 truncate text-right tabular-nums",
                exceedsBalance && "text-destructive",
              )}
            >
              {balanceLabel}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
};

interface CompactExchangeFieldProps {
  side: AssetPickerFieldSide;
  asset: Asset | null;
  chain?: Chain;
  className?: string;
  onOpen: () => void;
}

const CompactExchangeField = ({
  side,
  asset,
  chain,
  className,
  onOpen,
}: CompactExchangeFieldProps) => {
  const chainMeta = chain ? CHAIN_METADATA[chain] : undefined;
  const symbol = asset?.metadata.symbol ?? "Not Selected";
  const subtitle = asset?.metadata.displayName ?? chainMeta?.label ?? SIDE_LABEL[side];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-2xl border border-border/40 bg-muted/25 px-3 py-2.5 text-left sm:gap-3 sm:rounded-[20px] sm:px-4 sm:py-3",
        className,
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10 border border-border/40">
          {asset?.metadata.imageUrl ? (
            <AvatarImage src={asset.metadata.imageUrl} alt={symbol} />
          ) : null}
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        {chainMeta ? (
          <Avatar className="absolute -bottom-0.5 -right-0.5 size-4 border-2 border-background">
            <AvatarImage src={chainMeta.imageUrl} alt={chainMeta.label} />
          </Avatar>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{symbol}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
};

interface SwapExchangeAssetTriggerProps {
  fieldLabel: string;
  selectedAsset: Asset | null;
  className?: string;
}

export const SwapExchangeAssetTrigger = ({
  fieldLabel,
  selectedAsset,
  className,
}: SwapExchangeAssetTriggerProps) => {
  const displayName = selectedAsset
    ? (selectedAsset.metadata.displayName ?? selectedAsset.metadata.symbol ?? "Unknown")
    : "Not Selected";
  const ticker = selectedAsset?.metadata.symbol;
  const showTicker = Boolean(selectedAsset && ticker && displayName !== ticker);
  const chain = selectedAsset ? (selectedAsset.id.chain.$case as Chain) : undefined;
  const chainMeta = chain ? CHAIN_METADATA[chain] : undefined;

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 text-left",
        "rounded-xl transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="size-10 border border-border/40 bg-muted/40 sm:size-12">
          {selectedAsset?.metadata.imageUrl ? (
            <AvatarImage
              src={selectedAsset.metadata.imageUrl}
              alt={selectedAsset.metadata.symbol ?? displayName}
            />
          ) : null}
          <AvatarFallback className="bg-muted text-xs text-muted-foreground">?</AvatarFallback>
        </Avatar>
        {chainMeta ? (
          <Avatar
            className="absolute -bottom-0.5 -right-0.5 size-4 border-2 border-background"
            title={chainMeta.label}
          >
            <AvatarImage src={chainMeta.imageUrl} alt={chainMeta.label} />
            <AvatarFallback className="text-[8px]">{chainMeta.label[0]}</AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{fieldLabel}</p>
        <p className="truncate text-sm font-medium text-foreground sm:text-base">{displayName}</p>
        {showTicker && ticker ? (
          <p className="truncate text-xs text-muted-foreground">{ticker}</p>
        ) : null}
      </div>

      <ChevronDown
        className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
        aria-hidden
      />
    </div>
  );
};
