"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { UserAuthMenu } from "@/modules/auth/presentation/components/UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";

export const WalletMobileToolbar = () => {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background px-4 py-3 lg:hidden">
      <Link
        href="/wallets"
        className="inline-flex min-w-[4.5rem] items-center gap-1 text-xs font-medium text-primary"
      >
        <ChevronLeft className="size-3.5 shrink-0" aria-hidden />
        All wallets
      </Link>
      <span className="text-sm font-semibold text-foreground">TON Wallet</span>
      <div className="flex min-w-[4.5rem] items-center justify-end gap-2">
        <div className="[&_button]:size-8 [&_button]:rounded-lg [&_button]:border-border [&_button]:bg-explorer-surface-2">
          <ModeToggle />
        </div>
        <div className="[&_button]:size-8 [&_button]:rounded-lg [&_button]:border-border [&_button]:bg-explorer-surface-2">
          <UserAuthMenu />
        </div>
      </div>
    </div>
  );
};
