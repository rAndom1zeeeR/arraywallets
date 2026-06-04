import Link from "next/link";
import { UserAuthMenu } from "./UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";
import { appShellStyles } from "@/shared/presentation/components/data-table/data-table.styles";

export const AuthAppHeader = () => {
  return (
    <header className={appShellStyles.header}>
      <Link href="/wallets" className={appShellStyles.headerTitle}>
        TON Wallet
      </Link>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserAuthMenu />
      </div>
    </header>
  );
};
