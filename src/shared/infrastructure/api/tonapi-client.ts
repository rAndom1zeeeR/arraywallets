import { TonApiClient } from "@/shared/infrastructure/api/tonapi";
import { tonapiApiKey, tonapiBaseUrl } from "@/shared/config/env.server.config";

// Initialize the TonApi
export const TONAPI_CLIENT = new TonApiClient({
  baseUrl: tonapiBaseUrl,
  apiKey: tonapiApiKey,
});
