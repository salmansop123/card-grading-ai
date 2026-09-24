"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMovers } from "@/hooks/useMarketData";
import { formatPercent } from "@/lib/utils";

export function TopMoversWidget() {
  const { data, isLoading } = useMovers();

  if (isLoading) return <Card><CardContent className="p-6">Loading movers...</CardContent></Card>;

  const gainers = (data?.gainers || []) as Array<{ card_name: string; pct_change_24h?: number }>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Movers</CardTitle>
      </CardHeader>
      <CardContent>
        {gainers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No movers data yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {gainers.map((m, i) => (
              <Badge key={i} variant="success">
                {m.card_name} {formatPercent(m.pct_change_24h)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
