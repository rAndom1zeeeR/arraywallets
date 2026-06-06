"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserAuthMenu } from "@/modules/auth/presentation/components/UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";
import { explorerHeaderStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface ExplorerNavItem {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: ExplorerNavItem[] = [
  {
    href: "/wallets",
    label: "Wallets",
    isActive: pathname => pathname === "/wallets" || pathname.startsWith("/wallets/"),
  },
  {
    href: "/omnistone",
    label: "Omnistone",
    isActive: pathname => pathname === "/omnistone" || pathname.startsWith("/omnistone/"),
  },
];

function isWalletDetailPath(pathname: string): boolean {
  return pathname.startsWith("/wallets/") && pathname.length > "/wallets/".length;
}

export const ExplorerAppHeader = () => {
  const pathname = usePathname();
  const hideOnMobileWallet = isWalletDetailPath(pathname);

  return (
    <header
      className={cn(explorerHeaderStyles.root, hideOnMobileWallet && "hidden lg:flex")}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
        <Link href="/wallets" className={explorerHeaderStyles.brand}>
          TON Wallets
        </Link>
        <nav className={explorerHeaderStyles.nav} aria-label="Main navigation">
          {NAV_ITEMS.map(item => {
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  explorerHeaderStyles.navLink,
                  active ? explorerHeaderStyles.navLinkActive : explorerHeaderStyles.navLinkIdle
                )}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="[&_button]:size-8 [&_button]:rounded-lg [&_button]:border-border [&_button]:bg-explorer-surface-2">
          <ModeToggle />
        </div>
        <div className="[&_button]:size-8 [&_button]:rounded-lg [&_button]:border-border [&_button]:bg-explorer-surface-2">
          <UserAuthMenu />
        </div>
      </div>
    </header>
  );
};
