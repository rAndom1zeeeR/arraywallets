import { TONAPI_CLIENT } from "@/shared/infrastructure/api/tonapi-client";

/** [unix timestamp, price] from TonAPI `/v2/rates/chart`. */
type ChartPoint = [number, number];

const CHART_CACHE_TTL_MS = 60 * 60 * 1000;
const TONAPI_RATES_MIN_INTERVAL_MS = 1100;
const CHART_LOOKBACK_SEC = 365 * 24 * 60 * 60 * 2;

let lastTonapiRatesRequestAt = 0;
let tonUsdChartCache: { fetchedAt: number; points: ChartPoint[] } | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function throttleTonapiRates(): Promise<void> {
  const now = Date.now();
  const waitMs = lastTonapiRatesRequestAt + TONAPI_RATES_MIN_INTERVAL_MS - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastTonapiRatesRequestAt = Date.now();
}

function normalizeChartTimestampSec(ts: number): number {
  return ts > 10_000_000_000 ? Math.floor(ts / 1000) : ts;
}

/**
 * Nearest chart point to `targetSec` (unix seconds).
 */
export function lookupChartPriceUsd(points: ChartPoint[], targetSec: number): number | null {
  if (points.length === 0) {
    return null;
  }

  const target = normalizeChartTimestampSec(targetSec);
  let best = points[0];
  let bestDist = Math.abs(normalizeChartTimestampSec(best[0]) - target);

  for (const point of points) {
    const dist = Math.abs(normalizeChartTimestampSec(point[0]) - target);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }

  const price = best[1];
  return price > 0 && Number.isFinite(price) ? price : null;
}

/**
 * Loads TON/USD chart (cached ~1h). Used to convert TON legs to USDT at swap time.
 */
export async function loadTonUsdChartPoints(): Promise<ChartPoint[]> {
  if (tonUsdChartCache && Date.now() - tonUsdChartCache.fetchedAt < CHART_CACHE_TTL_MS) {
    return tonUsdChartCache.points;
  }

  const endDate = Math.floor(Date.now() / 1000);
  const startDate = endDate - CHART_LOOKBACK_SEC;

  await throttleTonapiRates();

  const response = await TONAPI_CLIENT.getChartRates({
    token: "ton",
    currency: "usd",
    start_date: startDate,
    end_date: endDate,
    points_count: 200,
  });

  const points = response.points ?? [];
  tonUsdChartCache = { fetchedAt: Date.now(), points };
  return points;
}

export function createTonUsdLookup(points: ChartPoint[]): (timestampSec: number) => number | null {
  return (timestampSec: number) => lookupChartPriceUsd(points, timestampSec);
}
