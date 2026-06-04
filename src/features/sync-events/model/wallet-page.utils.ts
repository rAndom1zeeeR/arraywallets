export function parsePageParam(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? value : undefined;
  if (!raw) {
    return 1;
  }

  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return page;
}
