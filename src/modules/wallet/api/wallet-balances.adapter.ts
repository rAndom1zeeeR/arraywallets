import { formatMoneyJetton, formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import type { SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";
import type {
  WalletAccountBalances,
  WalletJettonBalanceRow,
} from "@/modules/wallet/domain/wallet-balances.types";
import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";

type SerializedBigint = string | number | bigint;

interface SerializedWalletJettonBalanceRow {
  jetton: SwapJettonRef;
  balanceRaw: SerializedBigint;
  balance: string;
}

export interface SerializedWalletAccountBalances {
  tonBalanceNanoton: SerializedBigint;
  tonBalance: string;
  jettons: SerializedWalletJettonBalanceRow[];
}

function reviveJettonRow(row: SerializedWalletJettonBalanceRow): WalletJettonBalanceRow {
  const balanceRaw = parseNanoton(row.balanceRaw);

  return {
    jetton: row.jetton,
    balanceRaw,
    balance: row.balance || formatMoneyJetton(balanceRaw, row.jetton.decimals, row.jetton.symbol),
  };
}

export function reviveWalletAccountBalances(
  data: SerializedWalletAccountBalances
): WalletAccountBalances {
  const tonBalanceNanoton = parseNanoton(data.tonBalanceNanoton);

  return {
    tonBalanceNanoton,
    tonBalance: data.tonBalance || formatMoneyTonFromNanoton(tonBalanceNanoton),
    jettons: data.jettons.map(reviveJettonRow),
  };
}
