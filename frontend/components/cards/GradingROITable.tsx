import { PriceSnapshot } from "@/types/card";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface Props {
  prices?: PriceSnapshot;
  roi?: Record<string, unknown>;
}

export function GradingROITable({ prices, roi }: Props) {
  if (!prices) return null;

  const rows = [
    { grade: "Raw", price: prices.raw_price, roi: null },
    { grade: "PSA 8", price: prices.psa8_price, roi: null },
    { grade: "PSA 9", price: prices.psa9_price, roi: roi?.roi_to_psa9 as number },
    { grade: "PSA 10", price: prices.psa10_price, roi: roi?.roi_to_psa10 as number },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4">Grade</th>
            <th className="pb-2 pr-4">Price</th>
            <th className="pb-2">Est. ROI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.grade} className="border-b">
              <td className="py-2 pr-4 font-medium">{row.grade}</td>
              <td className="py-2 pr-4">{formatCurrency(row.price)}</td>
              <td className="py-2">{row.roi != null ? formatPercent(row.roi) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
