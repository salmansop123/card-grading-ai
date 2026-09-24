"use client";

import { usePortfolio } from "@/hooks/usePortfolio";

export function useVault() {
  return usePortfolio();
}
