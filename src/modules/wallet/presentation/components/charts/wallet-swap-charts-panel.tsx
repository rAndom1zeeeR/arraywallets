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
  buildDexDistributionSeries,
  buildDexVolumeSeries,
  buildJettonNetTonSeries,
  buildJettonTonVolumeSeries,
  buildSwapActionTypeSeries,
  buildSwapActivityCountSeries,
  buildSwapActivityVolumeSeries,
  buildSwapLegKindSeries,
} from "@/modules/wallet/domain/wallet-chart-data.utils";
import { WALLET_CHART_COLORS, WALLET_CHART_LOSS, WALLET_CHART_PROFIT } from "@/modules/wallet/domain/wallet-chart.constants";
import { ChartCard } from "@/modules/wallet/presentation/components/charts/chart-card";
import {
  CHART_HEIGHT,
  chartAxisTick,
  formatTooltipTon,
  chartGridStroke,
  chartTooltipProps,
} from "@/modules/wallet/presentation/components/charts/chart-axis-styles";

interface WalletSwapChartsPanelProps {
  stats: WalletSwapStatsResult;
}

function withColors<T extends { id: string; name: string }>(rows: T[]): Array<T & { fill: string }> {
  return rows.map((row, index) => ({
    ...row,
    fill: WALLET_CHART_COLORS[index % WALLET_CHART_COLORS.length],
  }));
}

export const WalletSwapChartsPanel = ({ stats }: WalletSwapChartsPanelProps) => {
  const { swaps, aggregate } = stats;

  const dexCount = useMemo(() => withColors(buildDexDistributionSeries(aggregate.byDex)), [aggregate.byDex]);
  const dexVolume = useMemo(() => withColors(buildDexVolumeSeries(aggregate.byDex)), [aggregate.byDex]);
  const legKinds = useMemo(() => withColors(buildSwapLegKindSeries(swaps)), [swaps]);
  const actionTypes = useMemo(() => withColors(buildSwapActionTypeSeries(swaps)), [swaps]);
  const activityCount = useMemo(() => buildSwapActivityCountSeries(swaps), [swaps]);
  const activityVolume = useMemo(() => buildSwapActivityVolumeSeries(swaps), [swaps]);
  const jettonTonVolume = useMemo(() => buildJettonTonVolumeSeries(aggregate), [aggregate]);
  const jettonNet = useMemo(() => buildJettonNetTonSeries(aggregate), [aggregate]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Swaps per day"
        description="Number of swap actions grouped by date."
        isEmpty={activityCount.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={activityCount} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={32} allowDecimals={false} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="value" name="Swaps" fill={WALLET_CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Swap TON volume per day"
        description="Sum of TON in + out per day."
        isEmpty={activityVolume.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={activityVolume} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval="preserveStartEnd" />
            <YAxis tick={chartAxisTick} width={48} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Volume"]}
            />
            <Bar dataKey="value" name="Volume" fill={WALLET_CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="DEX share (count)"
        description="Swap count by decentralized exchange."
        isEmpty={dexCount.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={dexCount}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={96}
              paddingAngle={2}
            >
              {dexCount.map(entry => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipProps} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="DEX share (TON volume)"
        description="TON volume routed through each DEX."
        isEmpty={dexVolume.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={dexVolume}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={96}
              paddingAngle={2}
            >
              {dexVolume.map(entry => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Volume"]}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Swap leg types"
        description="ton↔jetton, jetton↔jetton, and other leg classifications."
        isEmpty={legKinds.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <PieChart>
            <Pie
              data={legKinds}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={96}
              paddingAngle={2}
            >
              {legKinds.map(entry => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipProps} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Swap action types"
        description="Native jetton swaps vs inferred swap clusters."
        isEmpty={actionTypes.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={actionTypes} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={chartAxisTick} interval={0} />
            <YAxis tick={chartAxisTick} width={32} allowDecimals={false} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
              {actionTypes.map(entry => (
                <Cell key={entry.id} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="TON volume by jetton"
        description="TON paid + received in swaps involving each jetton."
        isEmpty={jettonTonVolume.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={jettonTonVolume}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={chartAxisTick} />
            <YAxis type="category" dataKey="name" tick={chartAxisTick} width={72} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "TON volume"]}
            />
            <Bar dataKey="value" fill={WALLET_CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title="Net TON by jetton"
        description="TON received minus TON paid per jetton (swap legs)."
        isEmpty={jettonNet.length === 0}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={jettonNet}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke={chartGridStroke} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={chartAxisTick} />
            <YAxis type="category" dataKey="name" tick={chartAxisTick} width={72} />
            <Tooltip
              {...chartTooltipProps}
              formatter={value => [formatTooltipTon(value), "Net"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {jettonNet.map(entry => (
                <Cell
                  key={entry.id}
                  fill={entry.value >= 0 ? WALLET_CHART_PROFIT : WALLET_CHART_LOSS}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
