import Link from "next/link";

import { UserAuthMenu } from "./UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";
import { appShellStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { AppLogo } from "@/shared/presentation/components/AppLogo";
import { cn } from "@/shared/lib/utils";

export const AuthAppHeader = () => {
  return (
    <header className={appShellStyles.header}>
      <Link
        href="/wallets"
        aria-label="TON Wallets"
        className={cn(appShellStyles.headerTitle, "flex items-center gap-2")}
      >
        <AppLogo alt="" />
        <span className="hidden md:inline" aria-hidden>
          TON WALLETS
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserAuthMenu />
      </div>
    </header>
  );
};
