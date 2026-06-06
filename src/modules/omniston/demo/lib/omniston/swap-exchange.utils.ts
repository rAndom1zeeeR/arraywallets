import { bigNumberToFloat, floatToBigNumber } from "@/modules/omniston/demo/lib/utils";
import type { Asset } from "@/modules/omniston/demo/models/asset";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatUsdUnitPrice(priceUsd: number): string {
  const abs = Math.abs(priceUsd);
  const maximumFractionDigits =
    abs >= 1 ? 2 : abs >= 0.01 ? 4 : abs >= 0.0001 ? 6 : 8;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(priceUsd);
}

export function formatAssetUnitPrice(asset: Asset | null): string {
  if (!asset?.priceUsd) {
    return "—";
  }

  return formatUsdUnitPrice(asset.priceUsd);
}

export function getAssetListValueLabels(asset: Asset): {
  primary: string;
  secondary: string | null;
} {
  const hasBalance = Boolean(asset.balance && asset.balance > 0n);

  if (hasBalance) {
    return {
      primary: formatAssetBalance(asset),
      secondary: formatAssetUsdBalance(asset),
    };
  }

  return {
    primary: formatAssetUnitPrice(asset),
    secondary: null,
  };
}

export function formatTokenAmountUsd(units: string, asset: Asset | null): string {
  if (!units || !asset?.priceUsd) {
    return "—";
  }

  const amount = Number.parseFloat(units);

  if (Number.isNaN(amount) || amount <= 0) {
    return "—";
  }

  return usdFormatter.format(amount * asset.priceUsd);
}

export function formatAssetBalance(asset: Asset | null): string {
  if (!asset?.balance) {
    return "—";
  }

  const amount = bigNumberToFloat(asset.balance, asset.metadata.decimals);
  const symbol = asset.metadata.symbol ?? "";

  return symbol ? `${amount} ${symbol}` : amount;
}

export function getMaxTokenAmount(asset: Asset | null): string | null {
  if (!asset?.balance || asset.balance <= 0n) {
    return null;
  }

  return bigNumberToFloat(asset.balance, asset.metadata.decimals);
}

export function isAmountExceedingAssetBalance(units: string, asset: Asset | null): boolean {
  if (!units || units === "." || !asset?.balance) {
    return false;
  }

  try {
    const amount = floatToBigNumber(units, asset.metadata.decimals);

    return amount > asset.balance;
  } catch {
    return false;
  }
}

export function formatAssetUsdBalance(asset: Asset | null): string {
  if (!asset?.balance || !asset.priceUsd) {
    return "—";
  }

  const amount = Number.parseFloat(bigNumberToFloat(asset.balance, asset.metadata.decimals));

  if (Number.isNaN(amount)) {
    return "—";
  }

  return usdFormatter.format(amount * asset.priceUsd);
}
