"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, portfolioApi } from "@/lib/api";
import { Portfolio, PerformancePoint, PortfolioComposition } from "@/types/portfolio";

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const { data } = await api.get<Portfolio>("/portfolio");
      return data;
    },
  });
}

export function useUpdateHolding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      holdingId,
      purchase_price,
      purchase_date,
    }: {
      holdingId: string;
      purchase_price?: number | null;
      purchase_date?: string | null;
    }) => {
      const { data } = await portfolioApi.updateHolding(holdingId, {
        purchase_price,
        purchase_date,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function usePortfolioStats() {
  const { data, ...rest } = usePortfolio();
  return { stats: data?.summary, ...rest };
}

export function usePortfolioPerformance(days = 30) {
  return useQuery({
    queryKey: ["portfolio-performance", days],
    queryFn: async () => {
      const { data } = await api.get<{ points: PerformancePoint[] }>(
        `/portfolio/performance?days=${days}`
      );
      return data.points;
    },
  });
}

export function usePortfolioComposition(groupBy: "set" | "rarity" = "set") {
  return useQuery({
    queryKey: ["portfolio-composition", groupBy],
    queryFn: async () => {
      const { data } = await api.get<PortfolioComposition>(
        `/portfolio/composition?group_by=${groupBy}`
      );
      return data;
    },
  });
}
