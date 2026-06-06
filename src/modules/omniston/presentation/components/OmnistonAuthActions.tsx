"use client";

import { EvmWalletButton } from "@/modules/omniston/demo/components/EvmWalletButton";
import { TonWalletButton } from "@/modules/auth/presentation/components/TonWalletButton";
import { cn } from "@/shared/lib/utils";

interface OmnistonAuthActionsProps {
  showEvmWallet: boolean;
}

export const OmnistonAuthActions = ({ showEvmWallet }: OmnistonAuthActionsProps) => {
  return (
    <div
      className={cn(
        "gap-2 border-b border-border pb-3 sm:pb-4",
        showEvmWallet ? "grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-end" : "flex justify-stretch",
      )}
    >
      {showEvmWallet ? <EvmWalletButton /> : null}
      <TonWalletButton className={showEvmWallet ? undefined : "w-full sm:ml-auto sm:w-auto"} />
    </div>
  );
};
