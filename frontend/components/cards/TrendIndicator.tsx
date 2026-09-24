import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  trend?: string;
}

export function TrendIndicator({ trend }: Props) {
  if (trend === "rising") return <TrendingUp className="h-4 w-4 text-green-600" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}
