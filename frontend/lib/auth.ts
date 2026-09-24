const TOKEN_KEY = "card_market_access_token";

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

export function getLocalAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setLocalAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearLocalAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
