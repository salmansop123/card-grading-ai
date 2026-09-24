import { Card } from "./card";

export interface WishlistItem {
  id: string;
  card: Card;
  target_price?: number | null;
  current_price?: number | null;
  price_source?: string | null;
  at_target: boolean;
  added_at: string;
}

export interface WishlistResponse {
  items: WishlistItem[];
}
