import { EbaySale } from "@/types/card";
import { formatCurrency } from "@/lib/utils";

interface Props {
  sales: EbaySale[];
}

export function RecentSalesTable({ sales }: Props) {
  if (sales.length === 0) {
    return <p className="text-sm text-muted-foreground">No recent eBay sales found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4">Title</th>
            <th className="pb-2 pr-4">Price</th>
            <th className="pb-2 pr-4">Condition</th>
            <th className="pb-2">Date</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((sale) => (
            <tr key={sale.id} className="border-b">
              <td className="py-2 pr-4 max-w-xs truncate">{sale.title}</td>
              <td className="py-2 pr-4 font-medium">{formatCurrency(sale.sold_price)}</td>
              <td className="py-2 pr-4">{sale.condition}</td>
              <td className="py-2">{sale.sold_date ? new Date(sale.sold_date).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
