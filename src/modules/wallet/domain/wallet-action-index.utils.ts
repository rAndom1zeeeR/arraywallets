/**
 * Detects missing action rows when orderIndex is not a dense 0..n-1 sequence.
 */
export function hasActionIndexGap(actionCount: number, maxOrderIndex: number | null): boolean {
  if (actionCount === 0 || maxOrderIndex === null) {
    return false;
  }

  return actionCount < maxOrderIndex + 1;
}
