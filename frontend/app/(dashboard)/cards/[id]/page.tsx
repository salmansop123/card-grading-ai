"use client";

import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useCard, useCardInsight, useGradingRoi } from "@/hooks/useCard";
import { usePortfolio } from "@/hooks/usePortfolio";
import { PriceHistoryChart } from "@/components/cards/PriceHistoryChart";
import { PriceTierBadges } from "@/components/cards/PriceTierBadges";
import { AIInsightPanel } from "@/components/cards/AIInsightPanel";
import { GradingROITable } from "@/components/cards/GradingROITable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { api } from "@/lib/api";

function daysHeld(purchaseDate?: string | null) {
  if (!purchaseDate) return null;
  const start = new Date(purchaseDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function CardDetailPage() {
  const params = useParams();
  const cardId = params.id as string;
  const { data: card, isLoading, refetch } = useCard(cardId);
  const { data: portfolio } = usePortfolio();
  const { data: insight, isLoading: insightLoading } = useCardInsight(cardId);
  const { data: roi } = useGradingRoi(cardId);

  const holding = portfolio?.holdings.find((h) => h.card.id === cardId);

  const handleRefresh = async () => {
    await api.post(`/cards/${cardId}/refresh-price`);
    setTimeout(() => refetch(), 3000);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (!card) {
    return <p>Card not found</p>;
  }

  const price = card.latest_price;
  const profit = holding?.gain_loss;
  const profitPct = holding?.gain_loss_pct;

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-primary hover:underline">
        ← Back to Portfolio
      </Link>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="relative h-80 w-60 shrink-0 rounded-lg bg-muted">
          {card.image_url && (
            <Image src={card.image_url} alt={card.card_name} fill className="object-contain p-4" unoptimized />
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-3xl font-bold">{card.card_name}</h1>
            <p className="text-muted-foreground">
              {card.set_name} #{card.card_number} · {card.year} · {card.rarity}
            </p>
          </div>
          <div>
            <p className="text-3xl font-bold">{formatCurrency(price?.estimated_value)}</p>
            {price?.pct_change_7d != null && (
              <p className={price.pct_change_7d >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercent(price.pct_change_7d)} (7d)
              </p>
            )}
          </div>
          {holding && (
            <div className="rounded-xl border border-card-border bg-amber-50/60 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">Cost</p>
                  <p className="text-xl font-bold text-card-text">
                    {holding.purchase_price != null
                      ? formatCurrency(holding.purchase_price)
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-card-text-muted">
                    Current Value
                  </p>
                  <p className="text-xl font-bold text-card-gold">
                    {holding.current_value != null
                      ? formatCurrency(holding.current_value)
                      : "—"}
                  </p>
                </div>
              </div>
              {holding.purchase_price != null && holding.current_value != null && (
                <p
                  className={`mt-2 text-sm font-semibold ${
                    (profit ?? 0) >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {(profit ?? 0) >= 0 ? "Profit" : "Loss"}:{" "}
                  {(profit ?? 0) >= 0 ? "+" : ""}
                  {formatCurrency(profit)}
                  {profitPct != null && ` (${formatPercent(profitPct)})`}
                </p>
              )}
            </div>
          )}
          <PriceTierBadges prices={price} />
          <div className="flex gap-2">
            <Button onClick={handleRefresh}>Refresh Price</Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Price History</TabsTrigger>
          <TabsTrigger value="grading">Grading ROI</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          {holding && <TabsTrigger value="ownership">Ownership</TabsTrigger>}
        </TabsList>
        <TabsContent value="history">
          <PriceHistoryChart data={card.price_history} />
        </TabsContent>
        <TabsContent value="grading">
          <GradingROITable prices={price} roi={roi} />
        </TabsContent>
        <TabsContent value="insights">
          <AIInsightPanel insight={insight} loading={insightLoading} />
        </TabsContent>
        {holding && (
          <TabsContent value="ownership">
            <div className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-lg text-card-text">Your Copy</h3>
                <Link
                  href="/upload"
                  className="text-sm font-medium text-card-gold hover:underline"
                >
                  Edit
                </Link>
              </div>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-card-text-muted">Quantity</dt>
                  <dd className="font-medium">{holding.quantity}</dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Condition</dt>
                  <dd className="font-medium">{holding.condition || "—"}</dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Status</dt>
                  <dd className="font-medium">
                    {holding.is_graded && holding.grading_company ? (
                      <span className="font-bold text-card-gold">
                        {holding.grading_company} {holding.grade}
                      </span>
                    ) : (
                      "Raw (Ungraded)"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Cost</dt>
                  <dd className="font-medium">
                    {holding.purchase_price != null
                      ? formatCurrency(holding.purchase_price)
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Current Value</dt>
                  <dd className="font-bold text-card-gold">
                    {holding.current_value != null
                      ? formatCurrency(holding.current_value)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Purchase Date</dt>
                  <dd className="font-medium">
                    {holding.purchase_date
                      ? new Date(holding.purchase_date + "T00:00:00").toLocaleDateString()
                      : "Not specified"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-card-text-muted">Days Held</dt>
                  <dd className="font-medium">
                    {holding.purchase_date ? `${daysHeld(holding.purchase_date)} days` : "—"}
                  </dd>
                </div>
              </dl>

              {holding.purchase_price != null && holding.current_value != null && (
                <div className="mt-6 rounded-xl border border-card-border bg-amber-50 p-4 text-sm">
                  <span
                    className={
                      (profit ?? 0) >= 0 ? "font-bold text-green-600" : "font-bold text-red-600"
                    }
                  >
                    {(profit ?? 0) >= 0 ? "Profit" : "Loss"}:{" "}
                    {(profit ?? 0) >= 0 ? "+" : ""}
                    {formatCurrency(profit)}
                    {profitPct != null && ` (${formatPercent(profitPct)})`}
                  </span>
                </div>
              )}

              {holding.notes && (
                <div className="mt-4">
                  <dt className="mb-1 text-sm text-card-text-muted">Notes</dt>
                  <dd className="rounded-xl bg-gray-50 p-3 text-sm text-card-text">{holding.notes}</dd>
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
