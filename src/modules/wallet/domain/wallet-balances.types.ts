import type { SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";

export interface WalletJettonBalanceRow {
  jetton: SwapJettonRef;
  balanceRaw: bigint;
  balance: string;
}

export interface WalletAccountBalances {
  tonBalanceNanoton: bigint;
  tonBalance: string;
  jettons: WalletJettonBalanceRow[];
}
