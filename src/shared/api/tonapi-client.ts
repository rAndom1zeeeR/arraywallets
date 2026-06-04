import { TonApiClient } from "@ton-api/client";
import { tonapiApiKey, tonapiBaseUrl } from "../config/env.config";

// Initialize the TonApi
export const TONAPI_CLIENT = new TonApiClient({
  baseUrl: tonapiBaseUrl,
  apiKey: tonapiApiKey,
});
