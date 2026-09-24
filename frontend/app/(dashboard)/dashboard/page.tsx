"use client";

import Link from "next/link";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useWishlist } from "@/hooks/useWishlist";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";
import { WishlistMiniTile } from "@/components/wishlist/WishlistMiniTile";
import { CostVsMarketChart } from "@/components/dashboard/CostVsMarketChart";
import { ProfitSummaryCard } from "@/components/dashboard/ProfitSummaryCard";
import { TopMoversWidget } from "@/components/dashboard/TopMoversWidget";
import { CardGrid } from "@/components/dashboard/CardGrid";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { PokemonDecor } from "@/components/shared/PokemonDecor";

export default function DashboardPage() {
  const { data, isLoading } = usePortfolio();
  const { data: wishlistItems = [] } = useWishlist();
  const { refreshing, refresh } = useRefreshPrices();

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <PokemonDecor emoji="growlithe" className="right-0 top-0 z-0 hidden sm:block" size={48} opacity={0.35} animate="float" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-card-text-muted">
          Overview of your collection performance and market data
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="btn-secondary-sm disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh Prices"}
          </button>
          <Link href="/upload" className="btn-primary px-4 py-2 text-sm">
            Add Card
          </Link>
        </div>
      </div>

      <ProfitSummaryCard summary={data?.summary} />

      <div className="relative">
        <PokemonDecor emoji="squirtleChill" className="left-4 top-2 z-0 hidden lg:block" size={44} opacity={0.3} animate="float" flip />
        <div className="grid gap-4 lg:grid-cols-3">
          <CostVsMarketChart className="col-span-2 rounded-2xl border border-card-border bg-white card-shadow lg:p-2" />
          <div className="rounded-2xl border border-card-border bg-white card-shadow [&_.rounded-lg]:border-card-border">
            <TopMoversWidget />
          </div>
        </div>
      </div>


      <div>
        <h2 className="mb-4 text-lg font-bold text-card-text">
          My Collection ({data?.holdings.length ?? 0} cards)
        </h2>
        {!data?.holdings.length ? (
          <EmptyState
            title="No cards yet"
            description="Upload or search for a card to start building your portfolio"
            actionLabel="Upload Card"
            onAction={() => (window.location.href = "/upload")}
          />
        ) : (
          <CardGrid holdings={data.holdings} compact />
        )}

      {wishlistItems.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-card-text">🌟 From Your Wishlist</h2>
            <Link href="/vault?tab=wishlist" className="text-sm font-medium text-card-gold hover:underline">
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {wishlistItems.slice(0, 6).map((item) => (
              <WishlistMiniTile key={item.id} item={item} compact />
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
