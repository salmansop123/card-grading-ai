"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import { MarkSoldPayload, PortfolioHolding } from "@/types/portfolio";

export function useSoldCards() {
  return useQuery({
    queryKey: ["sold-cards"],
    queryFn: async () => {
      const { data } = await portfolioApi.getSold();
      return data as PortfolioHolding[];
    },
  });
}

export function useMarkAsSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      holdingId,
      data,
    }: {
      holdingId: string;
      data: MarkSoldPayload;
    }) => {
      const { data: result } = await portfolioApi.markSold(holdingId, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sold-cards"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}

export function useRevertSold() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holdingId: string) => {
      const { data } = await portfolioApi.revertSold(holdingId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sold-cards"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
