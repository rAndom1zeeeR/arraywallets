"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import {
  buildInflowOutflowSeries,
  buildSwapActivityCountSeries,
} from "@/modules/wallet/domain/wallet-chart-data.utils";
import { WALLET_CHART_LOSS, WALLET_CHART_PROFIT } from "@/modules/wallet/domain/wallet-chart.constants";
import { ChartCard } from "@/modules/wallet/presentation/components/charts/chart-card";
import {
  CHART_HEIGHT,
  chartAxisTick,
  formatTooltipTon,
  chartGridStroke,
  chartTooltipProps,
} from "@/modules/wallet/presentation/components/charts/chart-axis-styles";

interface WalletActivityChartsPanelProps {
  stats: WalletSwapStatsResult;
}

export const WalletActivityChartsPanel = ({ stats }: WalletActivityChartsPanelProps) => {
  const { swaps, tonTransfers } = stats;

  const inflowOutflow = useMemo(
    () => buildInflowOutflowSeries(swaps, tonTransfers.items),
    [swaps, tonTransfers.items],
  );
  const swapActivity = useMemo(() => buildSwapActivityCountSeries(swaps), [swaps]);

  const transferCounts = useMemo(() => {
    const buckets = new Map<string, { name: string; deposits: number; withdrawals: number }>();

    for (const item of tonTransfers.items) {
      const date = item.timestampIso.slice(0, 10);
      const label = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const bucket = buckets.get(date) ?? { name: label, deposits: 0, withdrawals: 0 };

      if (item.direction === "INCOMING") {
        bucket.deposits += 1;
      } else {
        bucket.withdrawals += 1;
      }

      buckets.set(date, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [tonTransfers.items]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="TON inflow vs outflow"
        description="Daily TON received vs sent (swaps + pure transfers)."
        isEmpty={inflowOutflow.length === 0}
        className="xl:col-span-2"
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={inflowOutflow} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={48} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value)]}
            />
            <Bar dataKey="inflow" name="Inflow" fill={WALLET_CHART_PROFIT} radius={[4, 4, 0, 0]} />
            <Bar dataKey="outflow" name="Outflow" fill={WALLET_CHART_LOSS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Swap activity"
        description="Swap count per day."
        isEmpty={swapActivity.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={swapActivity} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={32} allowDecimals={false} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="value" name="Swaps" fill={WALLET_CHART_PROFIT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="TON transfer activity"
        description="Pure TON deposit and withdrawal counts per day."
        isEmpty={transferCounts.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={transferCounts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={32} allowDecimals={false} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="deposits" name="Deposits" fill={WALLET_CHART_PROFIT} radius={[4, 4, 0, 0]} />
            <Bar dataKey="withdrawals" name="Withdrawals" fill={WALLET_CHART_LOSS} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
