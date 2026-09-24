"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cardApi } from "@/lib/api";
import { ManualAddCardPayload, ManualAddCardResponse } from "@/types/card";

export function useManualAddCard() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: ManualAddCardPayload) => {
      const { data } = await cardApi.manualAdd(payload);
      return data as ManualAddCardResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-performance"] });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}
