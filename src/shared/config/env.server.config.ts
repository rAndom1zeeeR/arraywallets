import { serverEnv } from "./env.server.schema";
import { tonapiBaseUrl } from "./env.public.config";

/**
 * Server-only TonAPI credentials. Import only from API routes, services, and server modules.
 */

export { tonapiBaseUrl };

export const tonapiApiKey = serverEnv.TONAPI_API_KEY;
