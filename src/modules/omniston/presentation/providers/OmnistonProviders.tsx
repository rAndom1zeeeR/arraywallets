"use client";

import { OmnistonProvider } from "@ston-fi/omniston-sdk-react";
import type { ReactNode } from "react";
import { getOmnistonClient } from "@/modules/omniston/omniston.config";

interface OmnistonProvidersProps {
  children: ReactNode;
}

/**
 * Omniston WebSocket SDK context (RFQ + settlement builders).
 */
export const OmnistonProviders = ({ children }: OmnistonProvidersProps) => {
  return <OmnistonProvider omniston={getOmnistonClient()}>{children}</OmnistonProvider>;
};
