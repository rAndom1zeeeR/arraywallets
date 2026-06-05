/** Must stay in sync with {@link INFERRED_SWAP_ORDER_BASE} in swap-inference.utils. */
const INFERRED_SWAP_ORDER_BASE = 10_000;

/**
 * Detects missing action rows when orderIndex is not a dense 0..n-1 sequence.
 * Inferred swaps are stored at {@link INFERRED_SWAP_ORDER_BASE}+ and must not trigger gaps.
 */
export function hasActionIndexGap(actionCount: number, maxOrderIndex: number | null): boolean {
  if (actionCount === 0 || maxOrderIndex === null) {
    return false;
  }

  if (maxOrderIndex >= INFERRED_SWAP_ORDER_BASE) {
    return false;
  }

  return actionCount < maxOrderIndex + 1;
}
