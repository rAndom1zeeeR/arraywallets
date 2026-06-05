import Link from "next/link";
// import { Search } from "lucide-react";
import { UserAuthMenu } from "@/modules/auth/presentation/components/UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";
import { explorerHeaderStyles } from "@/shared/presentation/components/explorer/explorer.styles";
// import { cn } from "@/shared/lib/utils";

// interface ExplorerNavItem {
//   href: string;
//   label: string;
//   isActive?: boolean;
// }

// const NAV_ITEMS: ExplorerNavItem[] = [
//   { href: "/wallets", label: "Wallets", isActive: true },
//   { href: "/wallets", label: "Transactions" },
//   { href: "/wallets", label: "Tokens" },
//   { href: "/wallets", label: "NFTs" },
// ];

export const ExplorerAppHeader = () => {
  return (
    <header className={explorerHeaderStyles.root}>
      <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
        <Link href="/wallets" className={explorerHeaderStyles.brand}>
          TON Wallets
        </Link>
        {/* <nav className={explorerHeaderStyles.nav} aria-label="Main navigation">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                explorerHeaderStyles.navLink,
                item.isActive
                  ? explorerHeaderStyles.navLinkActive
                  : explorerHeaderStyles.navLinkIdle
              )}
              aria-current={item.isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav> */}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* <div className={explorerHeaderStyles.search} role="search">
          <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-sm text-muted-foreground">
            Search address or tx hash...
          </span>
        </div> */}
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
