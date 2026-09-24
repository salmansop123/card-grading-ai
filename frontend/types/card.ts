export interface Card {
  id: string;
  card_name: string;
  set_name?: string;
  set_code?: string;
  card_number?: string;
  year?: number;
  rarity?: string;
  card_type?: string;
  language?: string;
  image_url?: string;
  thumbnail_url?: string;
  pokemon_tcg_id?: string;
  scan_status: string;
  pricing_status: string;
  created_at: string;
}

export interface PriceSnapshot {
  estimated_value?: number;
  confidence_score?: number;
  raw_price?: number;
  psa8_price?: number;
  psa9_price?: number;
  psa10_price?: number;
  pct_change_7d?: number;
  pct_change_30d?: number;
  volatility_score?: number;
  recorded_at?: string;
}

export interface CardDetail extends Card {
  latest_price?: PriceSnapshot;
  price_history: PriceHistoryPoint[];
  ebay_sales: EbaySale[];
}

export interface PriceHistoryPoint {
  recorded_at: string;
  estimated_value?: number;
  raw_price?: number;
  psa8_price?: number;
  psa9_price?: number;
  psa10_price?: number;
}

export interface EbaySale {
  id: string;
  title?: string;
  sold_price?: number;
  condition?: string;
  sold_date?: string;
  listing_url?: string;
}

export interface CardSearchResult {
  pokemon_tcg_id: string;
  card_name: string;
  set_name?: string;
  set_code?: string;
  card_number?: string;
  year?: number | null;
  rarity?: string | null;
  card_type?: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  hp?: string | null;
  types?: string[];
  /** @deprecated use pokemon_tcg_id */
  id?: string;
  /** @deprecated use card_name */
  name?: string;
  /** @deprecated use card_number */
  number?: string;
}

export type CardCondition =
  | "Mint"
  | "Near Mint"
  | "Lightly Played"
  | "Moderately Played"
  | "Heavily Played"
  | "Damaged";

export type GradingCompany = "PSA" | "BGS" | "CGC" | "SGC";

export interface ManualAddCardPayload {
  pokemon_tcg_id: string;
  quantity: number;
  condition: CardCondition;
  is_graded: boolean;
  grading_company?: GradingCompany | null;
  grade?: number | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  notes?: string | null;
}

export interface CardStatus {
  card_id: string;
  pricing_status: string;
  scan_status: string;
}

export interface ManualAddCardResponse {
  holding_id: string;
  card_id: string;
  card: Card;
  pricing_status: string;
  estimated_value?: number | null;
  price_source?: string | null;
  merged?: boolean;
  message?: string | null;
  quantity?: number;
}

export interface CardStackItemPayload {
  quantity: number;
  condition: CardCondition | null;
  is_graded: boolean;
  grading_company?: GradingCompany | null;
  grade?: number | null;
  purchase_price?: number | null;
  purchase_date?: string | null;
  notes?: string | null;
}

export interface BatchAddCardEntry {
  pokemon_tcg_id: string;
  stacks: CardStackItemPayload[];
}

export interface BatchAddRequest {
  cards: BatchAddCardEntry[];
}

export interface BatchAddHoldingResult {
  holding_id: string;
  merged: boolean;
  quantity: number;
}

export interface BatchAddCardResult {
  pokemon_tcg_id: string;
  card_id: string;
  card_name: string;
  image_url?: string | null;
  estimated_value?: number | null;
  holdings: BatchAddHoldingResult[];
}

export interface BatchAddError {
  pokemon_tcg_id: string;
  error: string;
}

export interface BatchAddResponse {
  success_count: number;
  error_count: number;
  results: BatchAddCardResult[];
  errors: BatchAddError[];
}

export interface ScanStatus {
  status: string;
  confidence?: number;
  requires_confirmation?: boolean;
  card?: Card;
  extracted_data?: Record<string, unknown>;
  error_message?: string;
}
