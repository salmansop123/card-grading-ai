"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { WishlistItem } from "@/types/wishlist";

interface ToggleParams {
  isInWishlist: boolean;
  wishlistItemId?: string;
  pokemon_tcg_id: string;
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isInWishlist, wishlistItemId, pokemon_tcg_id }: ToggleParams) => {
      if (isInWishlist && wishlistItemId) {
        await api.delete(`/wishlist/${wishlistItemId}`);
        return null;
      }
      const { data } = await api.post<WishlistItem>("/wishlist/add", { pokemon_tcg_id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });
}
