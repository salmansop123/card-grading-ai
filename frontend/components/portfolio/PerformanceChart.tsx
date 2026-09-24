"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolioPerformance } from "@/hooks/usePortfolio";
import { formatCurrency } from "@/lib/utils";

export function PerformanceChart() {
  const { data, isLoading } = usePortfolioPerformance(30);
  const chartData = (data || []).map((p) => ({
    date: new Date(p.date).toLocaleDateString(),
    value: p.total_value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
