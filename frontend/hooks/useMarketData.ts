"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useTrending() {
  return useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data } = await api.get<{ cards: Array<Record<string, unknown>> }>("/market/trending");
      return data.cards;
    },
  });
}

export function useMovers() {
  return useQuery({
    queryKey: ["movers"],
    queryFn: async () => {
      const { data } = await api.get<{ gainers: unknown[]; losers: unknown[] }>("/market/movers");
      return data;
    },
  });
}
