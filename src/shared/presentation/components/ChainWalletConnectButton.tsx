"use client";

import { Copy, Unplug } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { cn } from "@/shared/lib/utils";

const formatAddressShort = (address: string): string => {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

interface ChainWalletConnectButtonProps {
  chainLabel: string;
  chainIconUrl: string;
  address?: string;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  onConnect: () => void;
  onDisconnect?: () => void;
}

interface ChainWalletButtonFaceProps {
  chainLabel: string;
  chainIconUrl: string;
  statusLabel: string;
  isAddress: boolean;
}

const ChainWalletButtonFace = ({
  chainLabel,
  chainIconUrl,
  statusLabel,
  isAddress,
}: ChainWalletButtonFaceProps) => (
  <>
    <span className="relative flex size-5 shrink-0 overflow-hidden rounded-full border border-border/60 bg-background">
      <img src={chainIconUrl} alt="" width={20} height={20} className="size-full object-cover" />
    </span>
    <span className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground">
      {chainLabel}
    </span>
    <span
      className={cn(
        "min-w-0 truncate text-xs sm:max-w-22",
        isAddress ? "ml-auto font-mono sm:ml-0" : "font-medium",
      )}
    >
      {statusLabel}
    </span>
  </>
);

/**
 * Unified wallet connect control with chain badge (TON / EVM).
 * Connected state opens a dropdown: copy address + disconnect.
 */
export const ChainWalletConnectButton = ({
  chainLabel,
  chainIconUrl,
  address,
  isLoading = false,
  disabled = false,
  className,
  onConnect,
  onDisconnect,
}: ChainWalletConnectButtonProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopyAddress = useCallback(async () => {
    if (!address) {
      return;
    }

    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [address]);

  const statusLabel = isLoading ? "Connecting…" : address ? formatAddressShort(address) : "Connect";
  const buttonClassName = cn(
    "h-9 min-w-0 gap-1.5 px-2 font-normal sm:gap-2 sm:px-2.5",
    "w-full justify-start sm:w-auto",
    className,
  );

  if (address && onDisconnect) {
    const copyLabel =
      copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : "Copy address";

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isLoading}
            className={buttonClassName}
            title={address}
          >
            <ChainWalletButtonFace
              chainLabel={chainLabel}
              chainIconUrl={chainIconUrl}
              statusLabel={statusLabel}
              isAddress
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              void handleCopyAddress();
            }}
          >
            <Copy aria-hidden />
            {copyLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              onDisconnect();
            }}
          >
            <Unplug aria-hidden />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || isLoading}
      className={buttonClassName}
      onClick={onConnect}
      title={address}
    >
      <ChainWalletButtonFace
        chainLabel={chainLabel}
        chainIconUrl={chainIconUrl}
        statusLabel={statusLabel}
        isAddress={Boolean(address)}
      />
    </Button>
  );
};
