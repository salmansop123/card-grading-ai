"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { CardSearchResult } from "@/types/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Toast } from "@/components/shared/Toast";
import { useAddToWishlist, useWishlist } from "@/hooks/useWishlist";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [wishlistAdding, setWishlistAdding] = useState<string | null>(null);
  const [recentlyWishlisted, setRecentlyWishlisted] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();
  const { data: wishlistItems = [] } = useWishlist();
  const addToWishlist = useAddToWishlist();

  const wishlistTcgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of wishlistItems) {
      if (item.card.pokemon_tcg_id) ids.add(item.card.pokemon_tcg_id);
    }
    return ids;
  }, [wishlistItems]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get<CardSearchResult[]>("/cards/search", { params: { q: query } });
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToVault = (result: CardSearchResult) => {
    const tcgId = result.pokemon_tcg_id || result.id!;
    sessionStorage.setItem(
      "manualAddPrefill",
      JSON.stringify({
        pokemon_tcg_id: tcgId,
        card_name: result.card_name || result.name,
        set_name: result.set_name,
        card_number: result.card_number || result.number,
        image_url: result.image_url,
        thumbnail_url: result.thumbnail_url,
        rarity: result.rarity,
        year: result.year,
      })
    );
    router.push(`/upload?tab=manual&prefill=${encodeURIComponent(tcgId)}`);
  };

  const handleAddToWishlist = async (result: CardSearchResult) => {
    const tcgId = result.pokemon_tcg_id || result.id!;
    if (wishlistTcgIds.has(tcgId)) return;

    setWishlistAdding(tcgId);
    try {
      await addToWishlist.mutateAsync({ pokemon_tcg_id: tcgId });
      setToast("Added to Wishlist 🌟");
      setRecentlyWishlisted((prev) => new Set(prev).add(tcgId));
      setTimeout(() => {
        setRecentlyWishlisted((prev) => {
          const next = new Set(prev);
          next.delete(tcgId);
          return next;
        });
      }, 2000);
    } finally {
      setWishlistAdding(null);
    }
  };

  const clearToast = useCallback(() => setToast(null), []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Search Cards</h1>
      <div className="flex gap-2">
        <Input
          placeholder="Search Pokémon cards (e.g. Charizard)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button type="button" disabled={loading} onClick={handleSearch}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-10">
          <LoadingSpinner />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((result) => {
          const tcgId = result.pokemon_tcg_id || result.id!;
          const name = result.card_name || result.name!;
          const number = result.card_number || result.number;
          const inWishlist = wishlistTcgIds.has(tcgId) || recentlyWishlisted.has(tcgId);
          const wishlistBusy = wishlistAdding === tcgId;

          return (
            <Card key={tcgId}>
              <CardContent className="flex gap-4 p-4">
                {result.image_url && (
                  <div className="relative h-24 w-16 shrink-0">
                    <Image src={result.image_url} alt={name} fill className="object-contain" unoptimized />
                  </div>
                )}
                <div className="flex flex-1 flex-col">
                  <h3 className="font-semibold">{name}</h3>
                  <p className="text-sm text-muted-foreground">{result.set_name}</p>
                  <p className="text-xs text-muted-foreground">#{number}</p>
                  <div className="mt-2 flex w-full gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddToVault(result)}
                      className="btn-primary flex-1 py-1.5 text-xs md:flex-none md:px-3"
                    >
                      📚 Add to Vault
                    </button>
                    <button
                      type="button"
                      disabled={inWishlist || wishlistBusy}
                      onClick={() => handleAddToWishlist(result)}
                      className="btn-secondary flex-1 py-1.5 text-xs disabled:opacity-60 md:flex-none md:px-3"
                    >
                      {inWishlist ? "✓ In Wishlist" : wishlistBusy ? "Adding..." : "🌟 Add to Wishlist"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Toast message={toast} onClear={clearToast} />
    </div>
  );
}
