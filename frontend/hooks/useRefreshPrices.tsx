"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface RefreshPricesContextValue {
  refreshing: boolean;
  refresh: () => Promise<void>;
  toast: string | null;
  clearToast: () => void;
}

const RefreshPricesContext = createContext<RefreshPricesContextValue | null>(null);

export function RefreshPricesProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const clearToast = useCallback(() => setToast(null), []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await api.post("/portfolio/refresh");
      await queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      setToast("Prices refreshed successfully.");
    } catch {
      setToast("Failed to refresh prices. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return (
    <RefreshPricesContext.Provider value={{ refreshing, refresh, toast, clearToast }}>
      {children}
    </RefreshPricesContext.Provider>
  );
}

export function useRefreshPrices() {
  const ctx = useContext(RefreshPricesContext);
  if (!ctx) {
    throw new Error("useRefreshPrices must be used within RefreshPricesProvider");
  }
  return ctx;
}
