"use client";

import { useAppKit } from "@reown/appkit/react";
import { useDisconnect, useAccount } from "wagmi";

import { CHAIN_METADATA, Chain } from "@/modules/omniston/demo/models/chain";
import { ChainWalletConnectButton } from "@/shared/presentation/components/ChainWalletConnectButton";
import { useClientMounted } from "@/shared/presentation/hooks/use-client-mounted";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";

const EVM_CHAIN_ICON = CHAIN_METADATA[Chain.ETHEREUM].imageUrl;

interface EvmWalletButtonProps {
  className?: string;
}

interface EvmWalletButtonActiveProps {
  chainIconUrl: string;
  className?: string;
}

const EvmWalletButtonActive = ({ chainIconUrl, className }: EvmWalletButtonActiveProps) => {
  const { open: openAppKit } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  return (
    <ChainWalletConnectButton
      chainLabel="EVM"
      chainIconUrl={chainIconUrl}
      address={isConnected ? address : undefined}
      onConnect={() => openAppKit({ view: "Connect" })}
      onDisconnect={() => disconnect()}
      className={className}
    />
  );
};

/**
 * EVM wallet connect (Reown AppKit) — same visual style as TON button.
 */
export const EvmWalletButton = ({ className }: EvmWalletButtonProps) => {
  const isClientMounted = useClientMounted();

  if (!isWalletConnectConfigured) {
    return (
      <ChainWalletConnectButton
        chainLabel="EVM"
        chainIconUrl={EVM_CHAIN_ICON}
        disabled
        onConnect={() => undefined}
        className={className}
      />
    );
  }

  if (!isClientMounted) {
    return (
      <ChainWalletConnectButton
        chainLabel="EVM"
        chainIconUrl={EVM_CHAIN_ICON}
        disabled
        onConnect={() => undefined}
        className={className}
      />
    );
  }

  return <EvmWalletButtonActive chainIconUrl={EVM_CHAIN_ICON} className={className} />;
};
