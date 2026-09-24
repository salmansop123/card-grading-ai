"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import { PortfolioHolding } from "@/types/portfolio";

function invalidatePortfolioCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["portfolio"] });
  queryClient.invalidateQueries({ queryKey: ["portfolio-trash"] });
  queryClient.invalidateQueries({ queryKey: ["wishlist"] });
}

export function useTrash() {
  return useQuery({
    queryKey: ["portfolio-trash"],
    queryFn: async () => {
      const { data } = await portfolioApi.getTrash();
      return data.items;
    },
  });
}

export function useMoveToTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holdingId: string) => {
      await portfolioApi.softDelete(holdingId);
    },
    onSuccess: () => invalidatePortfolioCaches(queryClient),
  });
}

export function useRestoreFromTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holdingId: string) => {
      await portfolioApi.restoreFromTrash(holdingId);
    },
    onSuccess: () => invalidatePortfolioCaches(queryClient),
  });
}

export function usePermanentDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (holdingId: string) => {
      await portfolioApi.permanentDelete(holdingId);
    },
    onSuccess: () => invalidatePortfolioCaches(queryClient),
  });
}

export function useEmptyTrash() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await portfolioApi.emptyTrash();
    },
    onSuccess: () => invalidatePortfolioCaches(queryClient),
  });
}

export type TrashItem = PortfolioHolding;
