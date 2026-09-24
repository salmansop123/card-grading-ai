"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PortfolioInsight } from "@/types/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export default function InsightsPage() {
  const [insight, setInsight] = useState<PortfolioInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<PortfolioInsight>("/insights/portfolio");
      setInsight(data);
    } catch {
      setInsight(null);
      setError("Unable to load portfolio insights. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsight();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={loadInsight}>
          Retry
        </Button>
      </div>
    );
  }

  if (!insight) {
    return <p className="text-muted-foreground">No portfolio insights available. Add cards to your portfolio first.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">AI Portfolio Insights</h1>
        <Button variant="outline" onClick={loadInsight}>
          Regenerate
        </Button>
      </div>

      {insight.raw_report?.source === "rules_fallback" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Showing rule-based insights. Add a valid <code className="text-xs">OPENROUTER_API_KEY</code> in{" "}
          <code className="text-xs">backend/.env</code> for full AI-powered analysis.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Portfolio Health
            <Badge>{insight.portfolio_health}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{insight.total_value_assessment}</p>
          <p className="mt-4 font-medium">{insight.overall_recommendation}</p>
        </CardContent>
      </Card>

      {insight.top_grading_candidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Grading Candidates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {insight.top_grading_candidates.map((c, i) => (
              <div key={i} className="rounded-lg border p-3">
                <p className="font-medium">{c.card_name}</p>
                <p className="text-sm text-muted-foreground">{c.reasoning}</p>
                <p className="text-sm text-green-600">Est. ROI: {c.estimated_roi_pct?.toFixed(0)}%</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {insight.concentration_warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {insight.concentration_warnings.map((w, i) => (
                <li key={i} className="text-sm">{w}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {insight.market_opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Market Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {insight.market_opportunities.map((o, i) => (
                <li key={i} className="text-sm">{o}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
