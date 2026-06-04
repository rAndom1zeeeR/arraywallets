import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import { cookies } from "next/headers";
import type { UserRole } from "@/shared/infrastructure/api/prisma-client";
import { TON_CREDENTIALS_PROVIDER_ID } from "@/modules/auth/domain/ton-connect.constants";
import { resolveUserRole } from "@/modules/auth/domain/resolve-user-role";
import {
  AUTH_ACCESS_MAX_AGE_SECONDS,
  AUTH_REFRESH_COOKIE,
  getRefreshCookieOptions,
} from "@/modules/auth/infrastructure/refresh-token/refresh-token.constants";
import {
  issueRefreshToken,
  revokeAllUserRefreshTokens,
  revokeRefreshToken,
} from "@/modules/auth/infrastructure/refresh-token/refresh-token.service";
import { getAuthSecret } from "@/shared/config/auth-env";
import { buildAuthProviders } from "@/shared/config/auth-providers";
import { prisma } from "@/shared/infrastructure/api/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: getAuthSecret(),
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: AUTH_ACCESS_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: AUTH_ACCESS_MAX_AGE_SECONDS,
  },
  providers: buildAuthProviders(),
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email ?? undefined;
      const walletAddress = user.walletAddress ?? undefined;
      const role = resolveUserRole(email, walletAddress);

      if (user.id && account?.provider !== TON_CREDENTIALS_PROVIDER_ID) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role },
        });
      }

      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const dbUser = user.id
          ? await prisma.user.findUnique({ where: { id: user.id } })
          : null;

        token.sub = user.id;
        token.role = dbUser?.role ?? user.role;
        token.walletAddress = dbUser?.walletAddress ?? user.walletAddress ?? undefined;
      } else if (trigger === "update" && token.sub) {
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub } });

        if (dbUser) {
          token.role = dbUser.role;
          token.walletAddress = dbUser.walletAddress ?? undefined;
        }
      }

      return token;
    },
    session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as UserRole;
        session.user.walletAddress =
          typeof token.walletAddress === "string" ? token.walletAddress : undefined;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) {
        return;
      }

      await revokeAllUserRefreshTokens(user.id);
      const { token } = await issueRefreshToken(user.id);
      const cookieStore = await cookies();
      cookieStore.set(AUTH_REFRESH_COOKIE, token, getRefreshCookieOptions());
    },
    async signOut() {
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;

      if (refreshToken) {
        await revokeRefreshToken(refreshToken);
      }

      cookieStore.delete(AUTH_REFRESH_COOKIE);
    },
    async createUser({ user }) {
      const role = resolveUserRole(user.email, user.walletAddress);

      await prisma.user.update({
        where: { id: user.id },
        data: { role },
      });
    },
  },
});
