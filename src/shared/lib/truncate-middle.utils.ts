/**
 * Truncates a long string in the middle (Tonviewer-style address display).
 */
export function truncateMiddle(
  value: string,
  startChars: number = 6,
  endChars: number = 6
): string {
  if (value.length <= startChars + endChars + 1) {
    return value;
  }

  return `${value.slice(0, startChars)}…${value.slice(-endChars)}`;
}
