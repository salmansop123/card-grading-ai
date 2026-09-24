"use client";

import { usePortfolio } from "@/hooks/usePortfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";

export function GainLossTable() {
  const { data } = usePortfolio();
  const holdings = data?.holdings || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gain / Loss</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4">Card</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2">Gain/Loss</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.holding_id} className="border-b">
                  <td className="py-2 pr-4">{h.card.card_name}</td>
                  <td className="py-2 pr-4">{formatCurrency(h.purchase_price)}</td>
                  <td className="py-2 pr-4">{formatCurrency(h.current_value)}</td>
                  <td className={`py-2 ${(h.gain_loss ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(h.gain_loss)} ({formatPercent(h.gain_loss_pct)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
