export const mobileHistoryStyles = {
  list: "flex flex-col",
  groupHeader:
    "sticky top-12 z-10 bg-background/95 px-4 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-background/90 lg:top-[var(--app-header-height,0px)]",
  row: "flex items-start gap-3 border-b border-border bg-background px-4 py-3 last:border-b-0",
  iconWrap: "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-explorer-surface-2",
  body: "flex min-w-0 flex-1 gap-2.5",
  content: "min-w-0 flex-1",
  title: "text-sm font-semibold leading-snug text-foreground",
  badgeRow: "mt-1",
  addressRow: "mt-1 flex min-w-0 items-center gap-1",
  addressLink: "truncate text-xs text-primary",
  detailsChip:
    "mt-1.5 inline-block max-w-full rounded bg-explorer-surface-2 px-2 py-0.5 text-xs leading-snug text-muted-foreground",
  amountCol: "flex w-[34%] max-w-[7.75rem] shrink-0 flex-col items-end text-right",
  amount: "text-sm font-semibold leading-tight tabular-nums break-words",
  amountCompact: "text-[11px] font-semibold leading-tight tabular-nums break-words",
  amountProfit: "text-profit",
  amountLoss: "text-loss",
  amountNeutral: "text-foreground",
  time: "mt-0.5 text-xs text-muted-foreground",
} as const;
