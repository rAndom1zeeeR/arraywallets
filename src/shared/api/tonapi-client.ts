import { TonApiClient } from "@/shared/api/ton-api";
import { tonapiApiKey, tonapiBaseUrl } from "@/shared/config/env.config";

// Initialize the TonApi
export const TONAPI_CLIENT = new TonApiClient({
  baseUrl: tonapiBaseUrl,
  apiKey: tonapiApiKey,
});
