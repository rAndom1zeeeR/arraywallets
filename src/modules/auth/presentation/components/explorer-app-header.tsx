"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { UserAuthMenu } from "@/modules/auth/presentation/components/UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { AppLogo } from "@/shared/presentation/components/AppLogo";
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
    isActive: (pathname) => pathname === "/wallets" || pathname.startsWith("/wallets/"),
  },
  {
    href: "/omnistone",
    label: "Omnistone",
    isActive: (pathname) => pathname === "/omnistone" || pathname.startsWith("/omnistone/"),
  },
];

function isWalletDetailPath(pathname: string): boolean {
  return pathname.startsWith("/wallets/") && pathname.length > "/wallets/".length;
}

interface ExplorerNavLinkProps {
  item: ExplorerNavItem;
  pathname: string;
  className?: string;
}

const ExplorerNavLink = ({ item, pathname, className }: ExplorerNavLinkProps) => {
  const active = item.isActive(pathname);

  return (
    <Link
      href={item.href}
      className={cn(
        explorerHeaderStyles.navLink,
        active ? explorerHeaderStyles.navLinkActive : explorerHeaderStyles.navLinkIdle,
        className,
      )}
      aria-current={active ? "page" : undefined}
    >
      {item.label}
    </Link>
  );
};

export const ExplorerAppHeader = () => {
  const pathname = usePathname();
  const hideOnMobileWallet = isWalletDetailPath(pathname);

  return (
    <header
      className={cn(
        explorerHeaderStyles.root,
        "flex-nowrap",
        hideOnMobileWallet && "hidden lg:flex",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
        <Link
          href="/wallets"
          aria-label="ArrayWallets"
          className={cn(explorerHeaderStyles.brand, "flex shrink-0 items-center gap-2")}
        >
          <AppLogo alt="" />
          <span className="hidden md:inline" aria-hidden>
            ArrayWallets
          </span>
        </Link>

        <nav className={cn(explorerHeaderStyles.nav, "hidden md:flex")} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <ExplorerNavLink key={item.label} item={item} pathname={pathname} />
          ))}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(explorerHeaderStyles.iconButton, "md:hidden")}
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40 md:hidden">
            {NAV_ITEMS.map((item) => {
              const active = item.isActive(pathname);

              return (
                <DropdownMenuItem key={item.label} asChild>
                  <Link
                    href={item.href}
                    className={cn(active && "bg-accent font-medium")}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

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
