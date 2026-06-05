import { cn } from "@/shared/lib/utils";

export const explorerStyles = {
  page: "flex min-h-[calc(100dvh-var(--app-header-height))] flex-col bg-background font-sans",
  breadcrumb:
    "flex flex-wrap items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground sm:px-8",
  content: "flex flex-1 flex-col gap-4 px-4 py-4 sm:px-8 sm:py-6 lg:flex-row lg:gap-6",
  sidebar: "flex w-full shrink-0 flex-col gap-4 lg:w-80",
  main: "flex min-w-0 flex-1 flex-col gap-4",
  card: "overflow-hidden rounded-xl border border-border bg-explorer-surface",
  cardHeader:
    "flex items-center justify-between border-b border-border px-5 py-4",
  cardBody: "flex flex-col gap-4 p-5",
  divider: "h-px bg-border",
  metricRow: "flex items-center justify-between gap-2",
  metricLabel: "text-sm text-muted-foreground",
  metricValue: "text-sm font-semibold text-foreground",
  metricSub: "ml-2 text-xs text-muted-foreground",
  tabList:
    "flex gap-0 overflow-x-auto border-b border-border scrollbar-thin-x [-webkit-overflow-scrolling:touch]",
  tabPanel:
    "min-w-0 overflow-x-auto scrollbar-table-x [-webkit-overflow-scrolling:touch]",
  tab: cn(
    "-mb-px border-b-2 px-5 py-2.5 text-sm font-medium transition-colors",
    "border-transparent text-muted-foreground hover:text-foreground"
  ),
  tabActive: "border-primary text-foreground",
  filterChip:
    "inline-flex items-center gap-1.5 rounded-lg border border-border bg-explorer-surface px-3 py-1.5 text-sm text-foreground",
  tableShell: "overflow-hidden rounded-xl border border-border bg-explorer-surface",
  tableScroll: "overflow-x-auto scrollbar-table-x [-webkit-overflow-scrolling:touch]",
  tableMinWidth: "min-w-[40rem]",
  tableHeader:
    "grid grid-cols-12 border-b border-border px-4 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase",
  tableGroup:
    "border-b border-border bg-background px-4 py-1.5 text-xs font-semibold text-muted-foreground",
  tableRow:
    "grid grid-cols-12 items-center border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-explorer-surface-2/40",
  directionIcon:
    "flex size-8 shrink-0 items-center justify-center rounded-xl bg-explorer-surface-2",
  actionBadge: "w-fit rounded px-1.5 py-0.5 text-xs font-medium",
  syncFooter:
    "w-full py-3 text-center text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

export const explorerHeaderStyles = {
  root: "flex flex-wrap items-center justify-between gap-3 border-b border-border bg-explorer-surface px-4 py-3 sm:px-8",
  brand: "text-base font-semibold text-foreground",
  nav: "flex items-center gap-1 overflow-x-auto scrollbar-thin-x",
  navLink: "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
  navLinkActive: "bg-explorer-surface-2 text-foreground",
  navLinkIdle: "text-muted-foreground hover:text-foreground",
  search:
    "hidden w-64 items-center gap-2 rounded-lg border border-border bg-explorer-surface-2 px-3 py-1.5 sm:flex",
  iconButton:
    "flex size-8 items-center justify-center rounded-lg border border-border bg-explorer-surface-2 text-muted-foreground transition-colors hover:text-foreground",
} as const;
