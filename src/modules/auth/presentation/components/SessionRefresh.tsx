"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { AUTH_ACCESS_MAX_AGE_SECONDS } from "@/modules/auth/infrastructure/refresh-token/refresh-token.constants";

const REFRESH_INTERVAL_MS = Math.max((AUTH_ACCESS_MAX_AGE_SECONDS - 60) * 1000, 60_000);

/**
 * Periodically rotates refresh token and extends the JWT session.
 */
export const SessionRefresh = () => {
  const { status, update } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const refreshSession = async () => {
      const response = await fetch("/api/auth/refresh", { method: "POST" });
      if (!response.ok) {
        return;
      }

      await update();
    };

    void refreshSession();
    const intervalId = window.setInterval(() => {
      void refreshSession();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [status, update]);

  return null;
};
