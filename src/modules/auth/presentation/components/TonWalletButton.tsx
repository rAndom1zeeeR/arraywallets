"use client";

import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useSession } from "next-auth/react";

import { CHAIN_METADATA, Chain } from "@/modules/omniston/demo/models/chain";
import { useTonWalletSignInContext } from "@/modules/auth/presentation/providers/TonWalletSignInProvider";
import { ChainWalletConnectButton } from "@/shared/presentation/components/ChainWalletConnectButton";
import { cn } from "@/shared/lib/utils";

interface TonWalletButtonProps {
  className?: string;
}

/**
 * Single TON entry point: connect + NextAuth sign-in in one TonConnect modal flow.
 */
export const TonWalletButton = ({ className }: TonWalletButtonProps) => {
  const { data: session } = useSession();
  const [tonConnectUI] = useTonConnectUI();
  const tonAddress = useTonAddress();
  const { isConnecting, openTonConnectModal } = useTonWalletSignInContext();

  const displayAddress = session?.user?.walletAddress ?? tonAddress ?? undefined;
  const isTonConnected = Boolean(tonAddress);

  const handleDisconnect = () => {
    void tonConnectUI?.disconnect();
  };

  return (
    <ChainWalletConnectButton
      chainLabel="TON"
      chainIconUrl={CHAIN_METADATA[Chain.TON].imageUrl}
      address={displayAddress}
      isLoading={isConnecting}
      className={cn(className)}
      onConnect={() => void openTonConnectModal()}
      onDisconnect={isTonConnected ? handleDisconnect : undefined}
    />
  );
};
