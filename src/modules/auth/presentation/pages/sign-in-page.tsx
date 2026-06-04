import Link from "next/link";
import { auth } from "@/auth";
import { SignInButtons } from "@/modules/auth/presentation/components/SignInButtons";
import { TonWalletSignIn } from "@/modules/auth/presentation/components/TonWalletSignIn";
import { redirect } from "next/navigation";
import { getOAuthProviderAvailability } from "@/shared/config/auth-providers";

interface SignInPageProps {
  callbackUrl?: string;
}

export const SignInPage = async ({ callbackUrl }: SignInPageProps) => {
  const session = await auth();
  const redirectTo = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  const oauthProviders = getOAuthProviderAvailability();
  const hasOAuth = oauthProviders.github || oauthProviders.google;

  if (session?.user) {
    redirect(redirectTo);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm">
          {hasOAuth
            ? "Sign in with TON wallet, GitHub, or Google."
            : "Sign in with your TON wallet."}
        </p>
      </div>
      <TonWalletSignIn callbackUrl={redirectTo} />
      {hasOAuth ? (
        <div className="relative w-full max-w-sm">
          <div className="border-border absolute inset-x-0 top-1/2 border-t" />
          <p className="text-muted-foreground relative mx-auto w-fit bg-background px-2 text-xs">
            or
          </p>
        </div>
      ) : null}
      <SignInButtons callbackUrl={redirectTo} oauthProviders={oauthProviders} />
      <Link href="/" className="text-muted-foreground text-sm underline-offset-4 hover:underline">
        Back to home
      </Link>
    </main>
  );
};
