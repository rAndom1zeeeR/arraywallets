"use client";

import { useAppKit } from "@reown/appkit/react";

import { useTonWalletConnect } from "@/modules/auth/presentation/hooks/use-ton-wallet-connect";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { CHAIN_METADATA, Chain, isEvmChain } from "@/modules/omniston/demo/models/chain";

interface QuoteActionConnectWalletProps {
  chain: Chain;
  className?: string;
}

const getConnectLabel = (chain: Chain): string => {
  if (chain === Chain.TON) {
    return "Connect Wallet";
  }

  const chainLabel = CHAIN_METADATA[chain]?.label ?? chain;
  return `Connect ${chainLabel} wallet`;
};

export const QuoteActionConnectWallet = ({ chain, className }: QuoteActionConnectWalletProps) => {
  const { openModal: openTonModal } = useTonWalletConnect();
  const { open: openAppKit } = useAppKit();

  const handleClick = () => {
    if (chain === Chain.TON) {
      void openTonModal();
      return;
    }

    if (isEvmChain(chain)) {
      openAppKit({ view: "Connect" });
    }
  };

  return (
    <Button type="button" variant="secondary" className={className} onClick={handleClick}>
      {getConnectLabel(chain)}
    </Button>
  );
};
