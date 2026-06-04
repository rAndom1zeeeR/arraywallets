import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { tonConnectProvider } from "@/modules/auth/infrastructure/auth/ton-connect.provider";

/**
 * OAuth providers are registered only when both client id and secret are set,
 * so a missing GitHub/Google env on production does not break Auth.js startup.
 */
export function buildAuthProviders(): Provider[] {
  const providers: Provider[] = [tonConnectProvider];

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push(GitHub);
  }

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(Google);
  }

  return providers;
}

export interface OAuthProviderAvailability {
  github: boolean;
  google: boolean;
}

/** Which OAuth buttons to show on the sign-in page (server-only). */
export function getOAuthProviderAvailability(): OAuthProviderAvailability {
  return {
    github: Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET),
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  };
}
