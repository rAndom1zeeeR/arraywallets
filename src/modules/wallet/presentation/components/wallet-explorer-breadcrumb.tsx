import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CopyToClipboardButton } from "@/shared/presentation/components/explorer/copy-to-clipboard-button";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerBreadcrumbProps {
  address: string;
}

export const WalletExplorerBreadcrumb = ({ address }: WalletExplorerBreadcrumbProps) => {
  return (
    <div className={cn(explorerStyles.breadcrumb, "hidden lg:flex")}>
      <Link href="/wallets" className="text-primary hover:underline">
        All wallets
      </Link>
      <ChevronRight className="size-3 shrink-0" aria-hidden />
      <span className="min-w-0 font-medium text-foreground break-all">{address}</span>
      <CopyToClipboardButton value={address} iconClassName="size-2.5" />
    </div>
  );
};
