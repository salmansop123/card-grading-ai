import { CardInsight } from "@/types/ai";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Props {
  insight?: CardInsight | null;
  loading?: boolean;
}

export function AIInsightPanel({ insight, loading }: Props) {
  if (loading) return <Card><CardContent className="p-6">Generating AI insight...</CardContent></Card>;

  if (insight && insight.available === false) {
    return (
      <div className="rounded-xl border border-card-border bg-gray-50 p-6 text-center">
        <p className="text-sm text-card-text-muted">🤖 AI market insights are not enabled yet.</p>
      </div>
    );
  }

  if (!insight) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Market Insight
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {insight.market_trend && <Badge variant="secondary">Trend: {insight.market_trend}</Badge>}
          {insight.investment_signal && <Badge>Signal: {insight.investment_signal}</Badge>}
          {insight.grade_recommendation && <Badge variant="success">Consider Grading</Badge>}
          {insight.grade_roi_estimate != null && (
            <Badge variant="warning">Est. ROI: {insight.grade_roi_estimate.toFixed(0)}%</Badge>
          )}
        </div>
        {insight.summary && <p className="text-sm">{insight.summary}</p>}
        {insight.signal_reasoning && <p className="text-sm text-muted-foreground">{insight.signal_reasoning}</p>}
      </CardContent>
    </Card>
  );
}
