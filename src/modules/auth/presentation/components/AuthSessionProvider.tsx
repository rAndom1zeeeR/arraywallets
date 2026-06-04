"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SessionRefresh } from "@/modules/auth/presentation/components/SessionRefresh";

interface AuthSessionProviderProps {
  children: ReactNode;
}

export const AuthSessionProvider = ({ children }: AuthSessionProviderProps) => {
  return (
    <SessionProvider>
      <SessionRefresh />
      {children}
    </SessionProvider>
  );
};
