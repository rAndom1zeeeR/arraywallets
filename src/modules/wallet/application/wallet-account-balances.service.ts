import type { JettonBalance, JettonPreview } from "@/shared/infrastructure/api/tonapi";
import { TONAPI_CLIENT } from "@/shared/infrastructure/api/tonapi-client";
import { callTonapi } from "@/shared/infrastructure/tonapi/tonapi-limiter";
import { formatMoneyJetton, formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import type { SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";
import type {
  WalletAccountBalances,
  WalletJettonBalanceRow,
} from "@/modules/wallet/domain/wallet-balances.types";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";

function mapJettonPreviewToRef(jetton: JettonPreview): SwapJettonRef {
  return {
    address: normalizeWalletAddress(jetton.address.toString()),
    symbol: jetton.symbol,
    name: jetton.name,
    decimals: jetton.decimals,
    image: jetton.image ?? null,
  };
}

function mapJettonBalanceRow(row: JettonBalance): WalletJettonBalanceRow | null {
  if (row.balance <= 0n) {
    return null;
  }

  const jetton = mapJettonPreviewToRef(row.jetton);

  return {
    jetton,
    balanceRaw: row.balance,
    balance: formatMoneyJetton(row.balance, jetton.decimals, jetton.symbol),
  };
}

function compareJettonBalances(a: WalletJettonBalanceRow, b: WalletJettonBalanceRow): number {
  if (a.balanceRaw !== b.balanceRaw) {
    return a.balanceRaw > b.balanceRaw ? -1 : 1;
  }

  return a.jetton.symbol.localeCompare(b.jetton.symbol);
}

/**
 * Loads on-chain TON balance and jetton wallet balances from TonAPI.
 */
export async function getWalletAccountBalances(address: string): Promise<WalletAccountBalances> {
  const [account, jettonsResponse] = await Promise.all([
    callTonapi(() => TONAPI_CLIENT.getAccount(address)),
    callTonapi(() =>
      TONAPI_CLIENT.getAccountJettonsBalances(address, {
        currencies: ["usd", "ton"],
        limit: 1000,
      })
    ),
  ]);

  const jettons = (jettonsResponse.balances ?? [])
    .map(mapJettonBalanceRow)
    .filter((row): row is WalletJettonBalanceRow => row !== null)
    .sort(compareJettonBalances);

  return {
    tonBalanceNanoton: account.balance,
    tonBalance: formatMoneyTonFromNanoton(account.balance),
    jettons,
  };
}
