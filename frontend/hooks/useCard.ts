"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardDetail } from "@/types/card";
import { CardInsight } from "@/types/ai";

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const { data } = await api.get<CardDetail>(`/cards/${cardId}/detail`);
      return data;
    },
    enabled: !!cardId,
  });
}

export function useCardInsight(cardId: string) {
  return useQuery({
    queryKey: ["card-insight", cardId],
    queryFn: async () => {
      const { data } = await api.get<CardInsight>(`/insights/card/${cardId}`);
      return data;
    },
    enabled: !!cardId,
  });
}

export function useGradingRoi(cardId: string) {
  return useQuery({
    queryKey: ["grading-roi", cardId],
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(`/cards/${cardId}/grading-roi`);
      return data;
    },
    enabled: !!cardId,
  });
}
