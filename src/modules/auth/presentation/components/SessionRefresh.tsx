"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { AUTH_ACCESS_MAX_AGE_SECONDS } from "@/modules/auth/infrastructure/refresh-token/refresh-token.constants";

const REFRESH_INTERVAL_MS = Math.max((AUTH_ACCESS_MAX_AGE_SECONDS - 60) * 1000, 60_000);

/**
 * Periodically rotates the httpOnly refresh token (not on every session refetch).
 */
export const SessionRefresh = () => {
  const { status, update } = useSession();
  const updateRef = useRef(update);
  const isRefreshingRef = useRef(false);

  updateRef.current = update;

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const rotateRefreshToken = async () => {
      if (isRefreshingRef.current) {
        return;
      }

      isRefreshingRef.current = true;

      try {
        const response = await fetch("/api/auth/refresh", { method: "POST" });
        if (!response.ok) {
          return;
        }

        await updateRef.current();
      } finally {
        isRefreshingRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void rotateRefreshToken();
    }, REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [status]);

  return null;
};
