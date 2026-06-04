"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

const handleSignOut = () => {
  void signOut({ callbackUrl: "/" });
};

export const UserAuthMenu = () => {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <span className="text-muted-foreground text-sm" aria-live="polite">
        …
      </span>
    );
  }

  if (!session?.user) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/sign-in">Sign in</Link>
      </Button>
    );
  }

  const roleLabel = session.user.role === "ADMIN" ? "Admin" : "User";
  const walletHint = session.user.walletAddress
    ? session.user.walletAddress.slice(0, 8)
    : null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground hidden text-sm sm:inline">
        {session.user.name ?? session.user.email ?? walletHint}
        <span className="text-foreground/70"> · {roleLabel}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSignOut}
        aria-label="Sign out"
      >
        <LogOut className="size-4" aria-hidden />
      </Button>
    </div>
  );
};
