import { useQuery } from "@tanstack/react-query";
import { fetchJettonRates } from "@/modules/jetton/api/jetton-rates.client";
import type { JettonRateQuote } from "@/modules/jetton/domain/jetton-rates.types";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";

const JETTON_RATES_STALE_MS = 60_000;

function buildRatesKey(addresses: string[]): string {
  return [...new Set(addresses.map(addr => toRawTonAddress(addr).toLowerCase()))].sort().join(",");
}

export function jettonRatesQueryKey(addresses: string[]): readonly ["jetton-rates", string] {
  return ["jetton-rates", buildRatesKey(addresses)] as const;
}

export function useJettonRates(addresses: string[]) {
  const uniqueAddresses = [...new Set(addresses)];

  return useQuery({
    queryKey: jettonRatesQueryKey(uniqueAddresses),
    queryFn: () => fetchJettonRates(uniqueAddresses),
    enabled: uniqueAddresses.length > 0,
    staleTime: JETTON_RATES_STALE_MS,
    select: data => data.rates,
  });
}

export function getJettonRateQuote(
  rates: Record<string, JettonRateQuote> | undefined,
  address: string
): JettonRateQuote | undefined {
  if (!rates) {
    return undefined;
  }

  try {
    return rates[toRawTonAddress(address).toLowerCase()];
  } catch {
    return undefined;
  }
}
