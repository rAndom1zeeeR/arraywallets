import { cn } from "@/shared/lib/utils";

/** Shared DropsTab-style table class names */
export const dataTableStyles = {
  shell: "w-full",
  scroll: "scrollbar-table-x -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0",
  table: "w-full border-collapse text-sm",
  thead: "border-b border-border",
  headerRow: "",
  headerCell:
    "whitespace-nowrap px-3 py-3 text-left text-xs font-normal text-muted-foreground first:pl-0 last:pr-0 sm:px-4 sm:py-3.5",
  headerCellRight: "text-right",
  tbody: "",
  bodyRow: "group transition-colors hover:bg-muted/40",
  bodyCell: "border-b border-border/60 px-3 py-4 align-top first:pl-0 last:pr-0 sm:px-4 sm:py-4",
  bodyCellRight: "text-right",
  subRow: "bg-muted/20",
  subRowCell: "px-3 py-4 sm:px-4",
  emptyCell: "px-3 py-8 text-center text-sm text-muted-foreground",
} as const;

export const dataTableShellStyles = {
  section: "space-y-4",
  header: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
  title: "text-xl font-bold tracking-tight text-foreground sm:text-2xl",
  subtitle: "mt-0.5 text-sm text-muted-foreground",
  controls: "flex flex-wrap items-center gap-3",
} as const;

export const pageStyles = {
  main: "mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8",
  pageTitle: "text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
  infoCard: "rounded-lg border border-border bg-card p-4 sm:p-5",
  section: "rounded-lg border border-border bg-card p-4 sm:p-5",
  sectionTitle: "text-lg font-semibold text-foreground",
  sectionSubtitle: "mt-0.5 text-sm text-muted-foreground",
  metricCard: "rounded-lg border border-border bg-secondary/50 p-3 sm:p-4",
  badge: "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
  pill: "inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground",
} as const;

export const tabStyles = {
  nav: "border-b border-border",
  list: "flex gap-0 overflow-y-hidden overflow-x-auto scrollbar-thin-x",
  tab: cn(
    "-mb-px shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
    "border-transparent text-muted-foreground hover:text-foreground"
  ),
  tabActive: "border-primary text-foreground",
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
