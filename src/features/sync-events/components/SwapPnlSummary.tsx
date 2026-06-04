import type { SwapPnlSummary as SwapPnlSummaryData } from "@/features/sync-events/lib/swap-pnl.utils";
import { cn } from "@/shared/lib/utils";

interface SwapPnlSummaryProps {
  pnl: SwapPnlSummaryData;
}

interface PnlCardProps {
  label: string;
  spent: string;
  received: string;
  net: string;
  netRaw: bigint;
}

function PnlCard({ label, spent, received, net, netRaw }: PnlCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 p-3 dark:border-gray-700 dark:bg-gray-900/90">
      <div className="text-xs font-semibold tracking-wide text-gray-500 uppercase">{label}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Spent</div>
          <div className="font-medium text-red-600 dark:text-red-400">{spent}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Received</div>
          <div className="font-medium text-green-600 dark:text-green-400">{received}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase">Net PnL</div>
          <div
            className={cn(
              "font-semibold",
              netRaw >= 0n ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}
          >
            {net}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SwapPnlSummary({ pnl }: SwapPnlSummaryProps) {
  const hasUsdtActivity = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;
  const topJettons = pnl.jettonLines.slice(0, 12);

  return (
    <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4 dark:border-sky-900 dark:bg-sky-950/30">
      <h2 className="text-lg font-semibold text-sky-900 dark:text-sky-100">Swap PnL (all deals)</h2>
      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
        Net = received − spent по всем <code className="text-[10px]">JETTON_SWAP</code>. USDT — отдельно по jetton
        USDT/USD₮.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PnlCard label="TON" {...pnl.ton} />
        {hasUsdtActivity ? (
          <PnlCard label="USDT" {...pnl.usdt} />
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white/50 p-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900/50">
            <div className="text-xs font-semibold tracking-wide uppercase">USDT</div>
            <p className="mt-2">Нет свапов с jetton USDT / USD₮ в данных.</p>
          </div>
        )}
      </div>

      {topJettons.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-sky-700 dark:text-sky-300">
            Jetton PnL ({pnl.jettonLines.length} tokens)
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-sky-200 text-left text-xs text-gray-500 uppercase dark:border-sky-900">
                  <th className="px-2 py-1.5">Jetton</th>
                  <th className="px-2 py-1.5 text-red-600">Spent</th>
                  <th className="px-2 py-1.5 text-green-600">Received</th>
                  <th className="px-2 py-1.5">Net</th>
                </tr>
              </thead>
              <tbody>
                {topJettons.map(line => (
                  <tr key={line.jetton.address} className="border-b border-sky-100/80 dark:border-sky-900/50">
                    <td className="px-2 py-1.5 font-medium">{line.jetton.symbol}</td>
                    <td className="px-2 py-1.5 text-red-600 dark:text-red-400">{line.spent}</td>
                    <td className="px-2 py-1.5 text-green-600 dark:text-green-400">{line.received}</td>
                    <td
                      className={cn(
                        "px-2 py-1.5 font-medium",
                        line.netRaw >= 0n ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}
                    >
                      {line.net}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pnl.jettonLines.length > topJettons.length && (
              <p className="mt-1 text-xs text-gray-500">
                +{pnl.jettonLines.length - topJettons.length} more in full jetton table below
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
