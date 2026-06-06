import { Omniston } from "@ston-fi/omniston-sdk-react";
import { omnistonWsUrl } from "@/shared/config/env.public.config";

let omnistonClient: Omniston | null = null;

/**
 * Singleton Omniston WebSocket client for the browser session.
 */
export function getOmnistonClient(): Omniston {
  if (!omnistonClient) {
    omnistonClient = new Omniston({
      apiUrl: omnistonWsUrl,
    });
  }

  return omnistonClient;
}
