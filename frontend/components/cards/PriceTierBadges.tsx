import { PriceSnapshot } from "@/types/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface Props {
  prices?: PriceSnapshot;
}

export function PriceTierBadges({ prices }: Props) {
  if (!prices) return null;

  const tiers = [
    { label: "Raw", value: prices.raw_price },
    { label: "PSA 8", value: prices.psa8_price },
    { label: "PSA 9", value: prices.psa9_price },
    { label: "PSA 10", value: prices.psa10_price },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {tiers.map((t) => (
        <Badge key={t.label} variant="outline" className="px-3 py-1">
          {t.label}: {formatCurrency(t.value)}
        </Badge>
      ))}
    </div>
  );
}
