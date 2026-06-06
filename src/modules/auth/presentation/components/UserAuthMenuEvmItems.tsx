"use client";

import { useAppKit } from "@reown/appkit/react";
import { WalletCards } from "lucide-react";
import { useAccount, useDisconnect } from "wagmi";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/shared/components/ui/dropdown-menu";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";

const formatEvmAddressShort = (address: string): string => {
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
};

interface UserAuthMenuEvmItemsProps {
  showSeparatorBefore?: boolean;
}

/**
 * EVM wallet connect / manage actions for the account dropdown (Reown AppKit).
 */
export const UserAuthMenuEvmItems = ({ showSeparatorBefore = false }: UserAuthMenuEvmItemsProps) => {
  const { open: openAppKit } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isWalletConnectConfigured) {
    return (
      <>
        {showSeparatorBefore ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem disabled title="Set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in .env">
          <WalletCards aria-hidden />
          EVM wallet unavailable
        </DropdownMenuItem>
      </>
    );
  }

  if (isConnected && address) {
    return (
      <>
        {showSeparatorBefore ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          className="font-mono text-xs"
          onSelect={(event) => {
            event.preventDefault();
            openAppKit({ view: "Account" });
          }}
        >
          <WalletCards aria-hidden />
          {formatEvmAddressShort(address)}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            disconnect();
          }}
        >
          Disconnect EVM wallet
        </DropdownMenuItem>
      </>
    );
  }

  return (
    <>
      {showSeparatorBefore ? <DropdownMenuSeparator /> : null}
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault();
          openAppKit({ view: "Connect" });
        }}
      >
        <WalletCards aria-hidden />
        Connect EVM wallet
      </DropdownMenuItem>
    </>
  );
};
