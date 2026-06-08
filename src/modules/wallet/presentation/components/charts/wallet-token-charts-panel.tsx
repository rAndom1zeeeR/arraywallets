"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import {
  buildPortfolioAllocationSeries,
  buildProfitByJettonSeries,
  disambiguateJettonLabels,
} from "@/modules/wallet/domain/wallet-chart-data.utils";
import { coerceNanoton, nanotonToTonNumber } from "@/shared/lib/ton/ton-amount.utils";
import {
  WALLET_CHART_COLORS,
  WALLET_CHART_LOSS,
  WALLET_CHART_PROFIT,
} from "@/modules/wallet/domain/wallet-chart.constants";
import { ChartCard } from "@/modules/wallet/presentation/components/charts/chart-card";
import {
  CHART_HEIGHT,
  chartAxisTick,
  formatTooltipTon,
  chartGridStroke,
  chartTooltipProps,
} from "@/modules/wallet/presentation/components/charts/chart-axis-styles";

interface WalletTokenChartsPanelProps {
  stats: WalletSwapStatsResult;
}

function withColors<T extends { id: string; name: string }>(rows: T[]): Array<T & { fill: string }> {
  return rows.map((row, index) => ({
    ...row,
    fill: WALLET_CHART_COLORS[index % WALLET_CHART_COLORS.length],
  }));
}

export const WalletTokenChartsPanel = ({ stats }: WalletTokenChartsPanelProps) => {
  const { portfolio, tonPortfolio, byJetton } = stats;

  const allocation = useMemo(
    () => withColors(buildPortfolioAllocationSeries(portfolio, tonPortfolio)),
    [portfolio, tonPortfolio],
  );
  const profitByJetton = useMemo(
    () => buildProfitByJettonSeries(portfolio, tonPortfolio),
    [portfolio, tonPortfolio],
  );
  const tonFlowByJetton = useMemo(() => {
    const rows = byJetton
      .map(row => ({
        id: row.jetton.address,
        name: row.jetton.symbol,
        tonPaid: nanotonToTonNumber(coerceNanoton(row.tonPaidNanoton)),
        tonReceived: nanotonToTonNumber(coerceNanoton(row.tonReceivedNanoton)),
      }))
      .filter(row => row.tonPaid > 0 || row.tonReceived > 0)
      .sort((a, b) => b.tonReceived - a.tonReceived)
      .slice(0, 12);

    return disambiguateJettonLabels(rows);
  }, [byJetton]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Portfolio allocation"
        description="Holdings value share by asset (TON)."
        isEmpty={allocation.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={allocation}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={100}
              paddingAngle={2}
            >
              {allocation.map(entry => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Value"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="PnL by token"
        description="Profit or loss per tracked jetton."
        isEmpty={profitByJetton.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={profitByJetton}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={chartAxisTick} />
            <YAxis type="category" dataKey="name" tick={chartAxisTick} width={72} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "PnL"]}
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
        title="TON flow by jetton"
        description="TON paid vs received when trading each jetton."
        isEmpty={tonFlowByJetton.length === 0}
        className="xl:col-span-2"
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={tonFlowByJetton} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval={0} angle={-20} textAnchor="end" height={52} />
            <YAxis tick={chartAxisTick} width={48} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="tonPaid" name="TON paid" fill={WALLET_CHART_LOSS} radius={[4, 4, 0, 0]} />
            <Bar dataKey="tonReceived" name="TON received" fill={WALLET_CHART_PROFIT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
