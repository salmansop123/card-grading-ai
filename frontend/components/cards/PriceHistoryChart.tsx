"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceHistoryPoint } from "@/types/card";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: PriceHistoryPoint[];
}

export function PriceHistoryChart({ data }: Props) {
  const [range, setRange] = useState(30);
  const filtered = data.slice(0, range).reverse();

  const chartData = filtered.map((p) => ({
    date: new Date(p.recorded_at).toLocaleDateString(),
    raw: p.raw_price,
    psa8: p.psa8_price,
    psa9: p.psa9_price,
    psa10: p.psa10_price,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Price History</CardTitle>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={range === d ? "default" : "outline"} size="sm" onClick={() => setRange(d)}>
              {d}D
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">No price history</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="raw" stroke="#3b82f6" name="Raw" dot={false} />
              <Line type="monotone" dataKey="psa8" stroke="#eab308" name="PSA 8" dot={false} />
              <Line type="monotone" dataKey="psa9" stroke="#22c55e" name="PSA 9" dot={false} />
              <Line type="monotone" dataKey="psa10" stroke="#a855f7" name="PSA 10" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
