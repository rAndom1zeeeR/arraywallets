import Link from "next/link";
import { UserAuthMenu } from "./UserAuthMenu";
import { ModeToggle } from "@/shared/components/mode-toggle";

export const AuthAppHeader = () => {
  return (
    <header className="border-border/40 flex items-center justify-between border-b px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        TON Wallet
      </Link>
      <div className="flex items-center gap-2">
        <ModeToggle />
        <UserAuthMenu />
      </div>
    </header>
  );
};
