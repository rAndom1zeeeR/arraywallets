export const mobileListStyles = {
  root: "divide-y divide-border/60",
  groupHeader:
    "sticky top-[var(--app-sticky-offset,0px)] z-10 bg-background/95 px-1 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm supports-[backdrop-filter]:bg-background/80",
  item: "flex gap-3 px-1 py-3.5 transition-colors active:bg-muted/30",
  iconWrap:
    "flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground",
  body: "min-w-0 flex-1",
  titleRow: "flex items-start justify-between gap-2",
  title: "text-sm font-medium leading-snug text-foreground",
  subtitle: "mt-0.5 text-xs text-primary",
  meta: "mt-1 text-xs text-muted-foreground",
  amount: "shrink-0 text-right text-sm font-semibold tabular-nums leading-snug",
  amountProfit: "text-profit",
  amountLoss: "text-foreground",
  badge: "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium",
  comment:
    "mt-2 rounded-md border border-border/60 bg-secondary/50 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground",
} as const;
