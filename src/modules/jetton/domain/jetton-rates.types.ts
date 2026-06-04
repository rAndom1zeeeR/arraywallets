export interface JettonRateQuote {
  usd: number | null;
  ton: number | null;
  diff24hUsd: string | null;
}

export interface JettonRatesResponse {
  rates: Record<string, JettonRateQuote>;
}
