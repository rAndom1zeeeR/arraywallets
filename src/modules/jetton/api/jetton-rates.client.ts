import type { JettonRatesResponse } from "@/modules/jetton/domain/jetton-rates.types";
import { apiClient } from "@/shared/infrastructure/api/client";

export function fetchJettonRates(addresses: string[]): Promise<JettonRatesResponse> {
  return apiClient<JettonRatesResponse>("/api/jettons/rates", {
    method: "POST",
    body: { addresses },
  });
}
