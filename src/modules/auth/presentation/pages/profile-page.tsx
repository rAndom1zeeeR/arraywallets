import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";

const formatWalletDisplay = (address: string): string => {
  if (address.length <= 20) {
    return address;
  }

  return `${address.slice(0, 10)}…${address.slice(-8)}`;
};

export const ProfilePage = async () => {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  const { user } = session;
  const roleLabel = user.role === "ADMIN" ? "Admin" : "User";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col gap-6 px-3 py-12 sm:px-4 sm:py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">Your account details</p>
      </div>
      <dl className="border-border/60 divide-border/60 flex flex-col divide-y rounded-lg border">
        {user.name ? (
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground text-sm">Name</dt>
            <dd className="text-sm font-medium">{user.name}</dd>
          </div>
        ) : null}
        {user.email ? (
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground text-sm">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
        ) : null}
        {user.walletAddress ? (
          <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
            <dt className="text-muted-foreground text-sm">Wallet</dt>
            <dd className="font-mono text-sm font-medium" title={user.walletAddress}>
              {formatWalletDisplay(user.walletAddress)}
            </dd>
          </div>
        ) : null}
        <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between">
          <dt className="text-muted-foreground text-sm">Role</dt>
          <dd className="text-sm font-medium">{roleLabel}</dd>
        </div>
      </dl>
      <Link href="/wallets" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
};
