import { Card } from "./card";

export interface PortfolioHolding {
  holding_id: string;
  card: Card;
  condition?: string;
  quantity: number;
  is_graded?: boolean;
  grading_company?: string | null;
  grade?: number | null;
  purchase_price?: number;
  purchase_date?: string | null;
  notes?: string | null;
  user_uploaded_image_url?: string | null;
  current_value?: number;
  gain_loss?: number;
  gain_loss_pct?: number;
  price_change_24h?: number;
  price_change_24h_pct?: number;
  trend?: string;
  last_price_update?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  days_in_trash?: number;
  days_remaining?: number;
  is_sold?: boolean;
  sold_price?: number | null;
  sold_date?: string | null;
  sold_quantity?: number | null;
  cost_basis?: number | null;
  total_revenue?: number | null;
  profit?: number | null;
  profit_pct?: number | null;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_gain_loss: number;
  total_gain_loss_pct: number;
  card_count: number;
  last_updated?: string;
}

export interface Portfolio {
  summary: PortfolioSummary;
  holdings: PortfolioHolding[];
}

export interface PerformancePoint {
  date: string;
  total_value: number;
}

export interface CompositionGroup {
  name: string;
  card_count: number;
  total_value: number;
  percentage: number;
}

export interface PortfolioComposition {
  group_by: string;
  groups: CompositionGroup[];
  total_value: number;
}

export interface MarkSoldPayload {
  sold_price: number;
  sold_date: string;
  sold_quantity?: number;
}
