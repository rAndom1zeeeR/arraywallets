"use client";

import { AppKitButton } from "@reown/appkit/react";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";
import { Button } from "@/modules/omniston/demo/components/ui/button";

interface EvmWalletButtonProps {
  size?: "md" | "sm";
}

/**
 * Reown AppKit connect button; disabled placeholder when project id is not configured.
 */
export const EvmWalletButton = ({ size = "md" }: EvmWalletButtonProps) => {
  if (!isWalletConnectConfigured) {
    return (
      <Button
        type="button"
        variant="outline"
        size={size === "sm" ? "sm" : "default"}
        disabled
        title="Set NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID in .env (https://cloud.reown.com)"
      >
        EVM wallet
      </Button>
    );
  }

  return <AppKitButton size={size} balance="hide" />;
};
