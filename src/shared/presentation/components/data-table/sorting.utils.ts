import type { Row, SortingFn } from "@tanstack/react-table";

export function coerceBigint(value: unknown): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    return BigInt(value);
  }

  return 0n;
}

export function compareBigint(a: bigint, b: bigint): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

export function compareNullableNumber(a: number | null | undefined, b: number | null | undefined): number {
  const aMissing = a === null || a === undefined || !Number.isFinite(a);
  const bMissing = b === null || b === undefined || !Number.isFinite(b);

  if (aMissing && bMissing) {
    return 0;
  }

  if (aMissing) {
    return 1;
  }

  if (bMissing) {
    return -1;
  }

  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

export function createBigintSortingFn<TData>(columnId: string): SortingFn<TData> {
  return (rowA: Row<TData>, rowB: Row<TData>) => {
    const a = coerceBigint(rowA.getValue(columnId));
    const b = coerceBigint(rowB.getValue(columnId));
    return compareBigint(a, b);
  };
}

export function createNullableNumberSortingFn<TData>(columnId: string): SortingFn<TData> {
  return (rowA: Row<TData>, rowB: Row<TData>) => {
    const a = rowA.getValue(columnId) as number | null | undefined;
    const b = rowB.getValue(columnId) as number | null | undefined;
    return compareNullableNumber(a, b);
  };
}

export function sumCounterpartAmounts(
  items: Array<{ amountRaw: bigint }>
): bigint {
  return items.reduce((sum, item) => sum + item.amountRaw, 0n);
}
