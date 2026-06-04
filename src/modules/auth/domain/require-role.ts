import { auth } from "@/auth";
import type { UserRole } from "@/shared/infrastructure/api/prisma-client";
import type { Session } from "next-auth";
import { redirect } from "next/navigation";

interface RequireRoleOptions {
  /** Where to send unauthenticated users. Defaults to `/sign-in`. */
  signInUrl?: string;
  /** Where to send authenticated users without the required role. */
  forbiddenUrl?: string;
}

/**
 * Ensures the current session has one of the allowed roles (server components / routes).
 */
export async function requireRole(
  allowedRoles: UserRole[],
  options: RequireRoleOptions = {}
): Promise<Session> {
  const session = await auth();
  const signInUrl = options.signInUrl ?? "/sign-in";
  const forbiddenUrl = options.forbiddenUrl ?? "/";

  if (!session?.user) {
    redirect(signInUrl);
  }

  if (!allowedRoles.includes(session.user.role)) {
    redirect(forbiddenUrl);
  }

  return session;
}

/**
 * Returns true when the session user has the given role.
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
  return session?.user?.role === role;
}
