import type { JettonPortfolioPnlLine } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { JettonSwapBreakdownFormatted, SwapActionSnapshot, SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";
import type { WalletEventsPageData } from "@/modules/wallet/api/wallet-api.handlers";
import type { WalletAccountBalances } from "@/modules/wallet/domain/wallet-balances.types";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";

/** Frontend-only blocklist — does not affect API/DB. */
const HIDDEN_JETTON_LABELS = ["durov_soset"] as const;

function normalizeJettonLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function matchesHiddenLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }

  const normalized = normalizeJettonLabel(value);
  return HIDDEN_JETTON_LABELS.some(label => normalized === label || normalized.includes(label));
}

export function isHiddenJettonSymbol(symbol: string | null | undefined): boolean {
  return matchesHiddenLabel(symbol);
}

export function isHiddenJetton(
  jetton: Pick<SwapJettonRef, "symbol" | "name"> | null | undefined
): boolean {
  if (!jetton) {
    return false;
  }

  return isHiddenJettonSymbol(jetton.symbol) || isHiddenJettonSymbol(jetton.name);
}

export function textMentionsHiddenJetton(text: string | null | undefined): boolean {
  if (!text?.trim()) {
    return false;
  }

  const lower = text.toLowerCase();
  return HIDDEN_JETTON_LABELS.some(label => lower.includes(label));
}

export function actionMentionsHiddenJetton(action: WalletEventActionRow): boolean {
  if (isHiddenJetton(action.jetton)) {
    return true;
  }

  if (isHiddenJetton(action.jettonIn)) {
    return true;
  }

  if (isHiddenJetton(action.jettonOut)) {
    return true;
  }

  if (textMentionsHiddenJetton(action.displayAmount)) {
    return true;
  }

  return textMentionsHiddenJetton(action.displayDetails);
}

function swapMentionsHiddenJetton(swap: SwapActionSnapshot): boolean {
  if (isHiddenJetton(swap.jettonIn)) {
    return true;
  }

  if (isHiddenJetton(swap.jettonOut)) {
    return true;
  }

  if (isHiddenJettonSymbol(swap.jettonInSymbol)) {
    return true;
  }

  if (isHiddenJettonSymbol(swap.jettonOutSymbol)) {
    return true;
  }

  return textMentionsHiddenJetton(swap.displayAmount);
}

function portfolioLineMentionsHiddenJetton(line: JettonPortfolioPnlLine | null): boolean {
  return line !== null && isHiddenJetton(line.jetton);
}

function filterJettonBreakdownRows(rows: JettonSwapBreakdownFormatted[]): JettonSwapBreakdownFormatted[] {
  return rows.filter(row => !isHiddenJetton(row.jetton));
}

function filterPortfolioLines(lines: JettonPortfolioPnlLine[]): JettonPortfolioPnlLine[] {
  return lines.filter(line => !isHiddenJetton(line.jetton));
}

/** Strips hidden jettons from wallet summary swap stats before UI render. */
export function sanitizeWalletSwapStats(stats: WalletSwapStatsResult): WalletSwapStatsResult {
  const byJetton = filterJettonBreakdownRows(stats.byJetton);
  const portfolio = filterPortfolioLines(stats.portfolio);
  const swaps = stats.swaps.filter(swap => !swapMentionsHiddenJetton(swap));
  const unclassified = stats.unclassified.filter(
    cluster =>
      !isHiddenJettonSymbol(cluster.jettonInSymbol) && !isHiddenJettonSymbol(cluster.jettonOutSymbol)
  );

  return {
    ...stats,
    byJetton,
    portfolio,
    swaps,
    unclassified,
    tonPortfolio: portfolioLineMentionsHiddenJetton(stats.tonPortfolio) ? null : stats.tonPortfolio,
    usdtPortfolio: portfolioLineMentionsHiddenJetton(stats.usdtPortfolio) ? null : stats.usdtPortfolio,
  };
}

/** Strips hidden jetton rows from on-chain balance panel data. */
export function sanitizeWalletAccountBalances(balances: WalletAccountBalances): WalletAccountBalances {
  return {
    ...balances,
    jettons: balances.jettons.filter(row => !isHiddenJetton(row.jetton)),
  };
}

/** Strips hidden jetton actions from wallet history page data. */
export function sanitizeWalletEventsPage(page: WalletEventsPageData): WalletEventsPageData {
  let removedActions = 0;
  let removedEvents = 0;

  const events = page.events
    .map(event => {
      const actions = event.actions.filter(action => {
        const hidden = actionMentionsHiddenJetton(action);
        if (hidden) {
          removedActions += 1;
        }
        return !hidden;
      });

      return { ...event, actions };
    })
    .filter(event => {
      if (event.actions.length === 0 && !event.inProgress) {
        removedEvents += 1;
        return false;
      }

      return true;
    });

  return {
    ...page,
    events,
    totalActions: Math.max(0, page.totalActions - removedActions - removedEvents),
    totalEvents: Math.max(0, page.totalEvents - removedEvents),
  };
}
