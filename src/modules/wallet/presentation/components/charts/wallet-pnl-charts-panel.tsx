"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import {
  buildCumulativeEquityFlowSeries,
  buildCumulativeRealizedPnlSeries,
  buildCumulativeSwapTonNetSeries,
  buildProfitByJettonSeries,
  buildTonWaterfallSeries,
} from "@/modules/wallet/domain/wallet-chart-data.utils";
import {
  WALLET_CHART_COLORS,
  WALLET_CHART_LOSS,
  WALLET_CHART_PRIMARY,
  WALLET_CHART_PROFIT,
} from "@/modules/wallet/domain/wallet-chart.constants";
import { ChartCard } from "@/modules/wallet/presentation/components/charts/chart-card";
import {
  CHART_HEIGHT,
  chartAxisTick,
  chartGridStroke,
  chartTooltipProps,
  formatTooltipTon,
} from "@/modules/wallet/presentation/components/charts/chart-axis-styles";

interface WalletPnlChartsPanelProps {
  stats: WalletSwapStatsResult;
}

export const WalletPnlChartsPanel = ({ stats }: WalletPnlChartsPanelProps) => {
  const { portfolio, tonPortfolio, pnl, tonPnlWithTransfers, swaps, tonTransfers } = stats;

  const cumulativeRealized = useMemo(
    () => buildCumulativeRealizedPnlSeries(portfolio, tonPortfolio),
    [portfolio, tonPortfolio],
  );
  const cumulativeSwapNet = useMemo(() => buildCumulativeSwapTonNetSeries(swaps), [swaps]);
  const cumulativeEquity = useMemo(
    () => buildCumulativeEquityFlowSeries(swaps, tonTransfers.items),
    [swaps, tonTransfers.items],
  );
  const profitByJetton = useMemo(
    () => buildProfitByJettonSeries(portfolio, tonPortfolio),
    [portfolio, tonPortfolio],
  );
  const waterfall = useMemo(
    () => buildTonWaterfallSeries(pnl.ton, tonPnlWithTransfers),
    [pnl.ton, tonPnlWithTransfers],
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Cumulative realized PnL"
        description="Realized profit in TON replayed from swap trades."
        isEmpty={cumulativeRealized.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={cumulativeRealized} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={56} tickFormatter={v => `${Number(v).toFixed(1)}`} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "PnL"]}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={WALLET_CHART_PRIMARY}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Cumulative swap TON net"
        description="Running net TON from swaps (received − spent)."
        isEmpty={cumulativeSwapNet.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={cumulativeSwapNet} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={56} tickFormatter={v => `${Number(v).toFixed(1)}`} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Net"]}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={WALLET_CHART_COLORS[0]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Cumulative TON flow"
        description="Swaps plus pure TON transfers over time."
        isEmpty={cumulativeEquity.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <LineChart data={cumulativeEquity} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={56} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Flow"]}
            />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke={WALLET_CHART_COLORS[1]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Profit by jetton"
        description="Current or realized PnL per asset (TON)."
        isEmpty={profitByJetton.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={profitByJetton}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={chartAxisTick} tickFormatter={v => `${Number(v).toFixed(1)}`} />
            <YAxis type="category" dataKey="name" tick={chartAxisTick} width={72} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Profit"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {profitByJetton.map(entry => (
                <Cell
                  key={entry.id}
                  fill={entry.value >= 0 ? WALLET_CHART_PROFIT : WALLET_CHART_LOSS}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="TON balance waterfall"
        description="Swap net → withdrawals → deposits → on-wallet TON."
        isEmpty={waterfall.length === 0}
        className="xl:col-span-2"
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={waterfall} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} />
            <YAxis tick={chartAxisTick} width={56} />
            <Tooltip
              {...chartTooltipProps}
              formatter={(value, _name, item) => {
                const payload = item.payload as { runningTotal?: number; isTotal?: boolean };
                if (payload.isTotal) {
                  return [formatTooltipTon(payload.runningTotal ?? value), "Balance"];
                }
                return [formatTooltipTon(value), "Step"];
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {waterfall.map(entry => (
                <Cell
                  key={entry.id}
                  fill={
                    entry.isTotal
                      ? WALLET_CHART_PRIMARY
                      : entry.value >= 0
                        ? WALLET_CHART_PROFIT
                        : WALLET_CHART_LOSS
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
