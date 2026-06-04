import { cn } from "@/shared/lib/utils";

/** Shared DropsTab-style table class names */
export const dataTableStyles = {
  shell: "w-full",
  scroll: "scrollbar-table-x overflow-x-auto md:-mx-0 md:px-0",
  table: "w-full border-collapse text-sm",
  thead: "border-b border-border",
  headerRow: "",
  headerCell: "whitespace-nowrap px-3 py-3 text-left text-xs font-normal text-muted-foreground sm:px-4 sm:py-3.5",
  headerCellRight: "text-right",
  tbody: "",
  bodyRow: "group transition-colors hover:bg-muted/40",
  bodyCell: "border-b border-border/60 px-3 py-4 align-top sm:px-4 sm:py-4",
  bodyCellRight: "text-right",
  subRow: "bg-muted/20",
  subRowCell: "px-3 py-4 sm:px-4",
  emptyCell: "px-3 py-8 text-center text-sm text-muted-foreground",
} as const;

export const dataTableShellStyles = {
  section: "space-y-4",
  header: "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
  title: "text-xl font-bold tracking-tight text-foreground sm:text-2xl",
  subtitle: "mt-0.5 text-sm text-muted-foreground",
  controls: "flex flex-wrap items-center gap-3",
} as const;

export const pageStyles = {
  main: "mx-auto min-h-screen max-w-7xl px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-6 lg:px-8",
  pageTitle: "text-xl font-bold tracking-tight text-foreground sm:text-3xl",
  infoCard: "rounded-xl border border-border bg-card p-3.5 sm:rounded-lg sm:p-5",
  section: "rounded-xl border border-border bg-card p-3.5 sm:rounded-lg sm:p-5",
  sectionTitle: "text-lg font-semibold text-foreground",
  sectionSubtitle: "mt-0.5 text-sm text-muted-foreground",
  metricCard: "rounded-lg border border-border bg-secondary/50 p-3 sm:p-4",
  badge: "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  pill: "inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground",
} as const;

export const tabStyles = {
  nav: "sticky top-[var(--app-header-height,3.25rem)] z-20 -mx-3 border-b border-border bg-background/95 px-3 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:-mx-0 sm:px-0",
  list: "flex gap-0 overflow-y-hidden overflow-x-auto scrollbar-thin-x [-webkit-overflow-scrolling:touch]",
  tab: cn(
    "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4 sm:py-3",
    "border-transparent text-muted-foreground hover:text-foreground"
  ),
  tabActive: "border-foreground text-foreground",
} as const;

export const appShellStyles = {
  header:
    "sticky top-0 z-30 border-b border-border/40 bg-background/95 px-3 py-2.5 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 sm:px-4 sm:py-3 flex flex-wrap items-center justify-between mx-auto max-w-7xl",
  headerTitle: "text-sm font-semibold tracking-tight sm:text-base",
} as const;

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:bg-accent hover:text-foreground",
  danger:
    "inline-flex items-center justify-center rounded-lg border border-loss/30 px-4 py-2 text-sm font-medium text-loss transition-colors hover:bg-loss/10 disabled:cursor-not-allowed disabled:opacity-50",
  warning:
    "inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50",
} as const;

export function getResponsiveHideClass(hideBelow?: "sm" | "md" | "lg"): string {
  switch (hideBelow) {
    case "sm":
      return "hidden sm:table-cell";
    case "md":
      return "hidden md:table-cell";
    case "lg":
      return "hidden lg:table-cell";
    default:
      return "";
  }
}
