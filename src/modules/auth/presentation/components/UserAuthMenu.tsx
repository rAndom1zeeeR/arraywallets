"use client";

import { useTonConnectUI } from "@tonconnect/ui-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUser, LogOut, UserRound, Wallet } from "lucide-react";
import { useCallback, useState } from "react";
import { useTonWalletSignIn } from "@/modules/auth/presentation/hooks/use-ton-wallet-sign-in";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

const formatWalletShort = (address: string, maxLength = 18): string => {
  if (address.length <= maxLength) {
    return address;
  }

  const half = Math.floor(maxLength / 2) - 1;
  return `${address.slice(0, half)}…${address.slice(-half)}`;
};

const getSessionDisplayName = (
  name: string | null | undefined,
  email: string | null | undefined
): string => {
  if (name) {
    return name;
  }

  if (email) {
    return email;
  }

  return "Account";
};

interface CopyableWalletAddressProps {
  address: string;
}

const CopyableWalletAddress = ({ address }: CopyableWalletAddressProps) => {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [address]);

  const label =
    copyState === "copied" ? "Copied!" : copyState === "error" ? "Copy failed" : formatWalletShort(address);

  return (
    <button
      type="button"
      className="text-foreground hover:text-primary w-full truncate text-left font-mono text-sm font-medium transition-colors"
      title={address}
      aria-label="Copy wallet address"
      onPointerDown={event => event.preventDefault()}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        void handleCopy();
      }}
    >
      {label}
    </button>
  );
};

export const UserAuthMenu = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [tonConnectUI] = useTonConnectUI();
  const callbackUrl = pathname && pathname !== "/sign-in" ? pathname : "/";
  const { isConnecting, openTonConnectModal } = useTonWalletSignIn({ callbackUrl });

  const handleSignOut = async () => {
    if (tonConnectUI?.connected) {
      await tonConnectUI.disconnect();
    }

    await signOut({ callbackUrl: "/" });
  };

  const isAuthenticated = Boolean(session?.user);
  const walletAddress = session?.user?.walletAddress;
  const displayName = session?.user
    ? getSessionDisplayName(session.user.name, session.user.email)
    : "Account";
  const roleLabel =
    session?.user?.role === "ADMIN" ? "Admin" : session?.user ? "User" : "Guest";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={status === "loading"}
          aria-label="Open account menu"
        >
          <CircleUser className="size-[1.2rem]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            {walletAddress ? (
              <CopyableWalletAddress address={walletAddress} />
            ) : (
              <span className="text-foreground truncate text-sm font-medium">{displayName}</span>
            )}
            <span className="text-muted-foreground text-xs">{roleLabel}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAuthenticated ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserRound aria-hidden />
                Profile
              </Link>
            </DropdownMenuItem>
            {walletAddress ? (
              <DropdownMenuItem asChild>
                <Link href={getWalletPagePath(walletAddress)}>
                  <Wallet aria-hidden />
                  My Wallet
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void handleSignOut();
              }}
            >
              <LogOut aria-hidden />
              Sign out
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            disabled={isConnecting}
            onSelect={event => {
              event.preventDefault();
              void openTonConnectModal();
            }}
          >
            <Wallet aria-hidden />
            {isConnecting ? "Connecting…" : "Sign in with TON Connect"}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
