export const walletQueryKeys = {
  root: (address: string) => ["wallet", address] as const,
  summary: (address: string) => [...walletQueryKeys.root(address), "summary"] as const,
  events: (address: string, page: number, swapsOnly: boolean) =>
    [...walletQueryKeys.root(address), "events", page, swapsOnly] as const,
};
