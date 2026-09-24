"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { portfolioApi } from "@/lib/api";
import { BatchAddRequest, BatchAddResponse } from "@/types/card";

export function useBatchAddCards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BatchAddRequest) => {
      const { data } = await portfolioApi.batchAdd(payload);
      return data as BatchAddResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-performance"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
