"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WishlistItem, WishlistResponse } from "@/types/wishlist";

export function useWishlist() {
  return useQuery({
    queryKey: ["wishlist"],
    queryFn: async () => {
      const { data } = await api.get<WishlistResponse>("/wishlist");
      return data.items;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { pokemon_tcg_id: string; target_price?: number | null }) => {
      const { data } = await api.post<WishlistItem>("/wishlist/add", payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}

export function useRemoveFromWishlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wishlistItemId: string) => {
      await api.delete(`/wishlist/${wishlistItemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
