import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/shared/infrastructure/api/prisma-client";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      walletAddress?: string;
    };
  }

  interface User {
    role: UserRole;
    walletAddress?: string | null;
  }
}

declare module "@auth/core/adapters" {
  interface AdapterUser {
    role: UserRole;
    walletAddress?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    walletAddress?: string;
  }
}
