import { PerformancePoint, PortfolioHolding, PortfolioSummary } from "@/types/portfolio";

/** Canonical portfolio totals — always derived from PortfolioSummary (API source of truth). */
export interface PortfolioTotals {
  totalCost: number;
  marketValue: number;
  unrealizedGainLoss: number;
  gainLossPct: number;
}

export function getPortfolioTotals(summary?: PortfolioSummary | null): PortfolioTotals {
  const totalCost = summary?.total_cost ?? 0;
  const marketValue = summary?.total_value ?? 0;
  const unrealizedGainLoss = summary?.total_gain_loss ?? marketValue - totalCost;
  const gainLossPct = summary?.total_gain_loss_pct ?? 0;
  return { totalCost, marketValue, unrealizedGainLoss, gainLossPct };
}

/** Per-holding market value using the same formula as portfolio summary aggregation. */
export function holdingMarketValue(holding: PortfolioHolding): number {
  return (holding.current_value ?? 0) * holding.quantity;
}

export interface CostVsMarketChartPoint {
  /** Unique ISO date key for the x-axis (YYYY-MM-DD). */
  dateKey: string;
  /** Human-readable axis / tooltip label. */
  dateLabel: string;
  totalCost: number;
  marketValue: number;
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatChartDateLabel(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Build chart series anchored to PortfolioSummary totals.
 * The latest point always uses summary.total_cost and summary.total_value exactly.
 */
export function buildCostVsMarketChartData(
  summary: PortfolioSummary | undefined,
  performance: PerformancePoint[] | undefined
): CostVsMarketChartPoint[] {
  const { totalCost, marketValue } = getPortfolioTotals(summary);

  if (!summary) {
    return [];
  }

  const byDate = new Map<string, number>();

  for (const point of performance ?? []) {
    const dateKey = toDateKey(point.date);
    byDate.set(dateKey, point.total_value);
  }

  const sortedKeys = Array.from(byDate.keys()).sort();
  const points: CostVsMarketChartPoint[] = sortedKeys.map((dateKey) => ({
    dateKey,
    dateLabel: formatChartDateLabel(dateKey),
    totalCost,
    marketValue: byDate.get(dateKey) ?? 0,
  }));

  const latestKey = todayDateKey();

  if (points.length === 0) {
    return [
      {
        dateKey: latestKey,
        dateLabel: "Today",
        totalCost,
        marketValue,
      },
    ];
  }

  const last = points[points.length - 1];
  if (last.dateKey === latestKey) {
    last.totalCost = totalCost;
    last.marketValue = marketValue;
  } else {
    points.push({
      dateKey: latestKey,
      dateLabel: "Today",
      totalCost,
      marketValue,
    });
  }

  return points;
}

/** Y-axis tick formatter shared by cost vs market charts. */
export function formatPortfolioAxisValue(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }
  return `$${Math.round(value)}`;
}

export interface PortfolioValueTrendPoint {
  date: string;
  total_value: number;
}

/** Build area-chart series; latest point anchored to summary.total_value. */
export function buildPortfolioValueTrendData(
  summary: PortfolioSummary | undefined,
  performance: PerformancePoint[] | undefined
): PortfolioValueTrendPoint[] {
  const marketValue = summary?.total_value ?? 0;
  if (!summary) return [];

  const byDate = new Map<string, number>();
  for (const point of performance ?? []) {
    byDate.set(toDateKey(point.date), point.total_value);
  }

  const sortedKeys = Array.from(byDate.keys()).sort();
  const points: PortfolioValueTrendPoint[] = sortedKeys.map((dateKey) => ({
    date: formatChartDateLabel(dateKey),
    total_value: byDate.get(dateKey) ?? 0,
  }));

  const latestKey = todayDateKey();
  if (points.length === 0) {
    return [{ date: "Today", total_value: marketValue }];
  }

  const lastKey = sortedKeys[sortedKeys.length - 1];
  if (lastKey === latestKey) {
    points[points.length - 1].total_value = marketValue;
  } else {
    points.push({ date: "Today", total_value: marketValue });
  }

  return points;
}
