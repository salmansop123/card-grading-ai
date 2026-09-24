export interface CardInsight {
  available?: boolean;
  message?: string;
  card_id?: string;
  market_trend?: string;
  trend_reason?: string;
  investment_signal?: string;
  signal_reasoning?: string;
  grade_recommendation?: boolean;
  grade_roi_estimate?: number;
  key_risks?: string[];
  key_catalysts?: string[];
  summary?: string;
  generated_at?: string;
}

export interface PortfolioInsight {
  portfolio_health: string;
  total_value_assessment: string;
  top_grading_candidates: Array<{
    card_id: string;
    card_name: string;
    raw_price: number;
    psa10_price: number;
    estimated_roi_pct: number;
    reasoning: string;
  }>;
  sell_candidates: Array<{ card_id: string; card_name: string; reasoning: string }>;
  concentration_warnings: string[];
  market_opportunities: string[];
  overall_recommendation: string;
  generated_at?: string;
  raw_report?: { source?: string };
}
