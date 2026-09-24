import axios from "axios";
import { API_URL } from "./constants";
import { getLocalAccessToken } from "./auth";
import { getAccessToken } from "./supabase";
import { ManualAddCardPayload, BatchAddRequest } from "@/types/card";
import { MarkSoldPayload, PortfolioHolding } from "@/types/portfolio";

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const localToken = getLocalAccessToken();
  if (localToken) {
    config.headers.Authorization = `Bearer ${localToken}`;
    return config;
  }
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const cardApi = {
  search: (q: string) =>
    api.get("/cards/search", { params: { q, page_size: 20 } }),

  manualAdd: (payload: ManualAddCardPayload) =>
    api.post("/portfolio/manual-add", payload),

  getCardStatus: (cardId: string) =>
    api.get(`/cards/${cardId}/status`),
};

export const portfolioApi = {
  getTrash: () => api.get<{ items: PortfolioHolding[] }>("/portfolio/trash"),
  restoreFromTrash: (id: string) => api.post(`/portfolio/trash/${id}/restore`),
  permanentDelete: (id: string) => api.delete(`/portfolio/trash/${id}`),
  emptyTrash: () => api.delete("/portfolio/trash"),
  softDelete: (id: string) => api.delete(`/portfolio/${id}`),
  getSold: () => api.get<PortfolioHolding[]>("/portfolio/sold"),
  markSold: (id: string, data: MarkSoldPayload) =>
    api.post(`/portfolio/${id}/mark-sold`, data),
  revertSold: (id: string) => api.post(`/portfolio/sold/${id}/revert`),
  getHoldingsForCard: (pokemonTcgId: string) =>
    api.get<PortfolioHolding[]>(`/portfolio/holdings-for-card/${pokemonTcgId}`),
  batchAdd: (payload: BatchAddRequest) => api.post("/portfolio/batch-add", payload),
  updateHolding: (
    id: string,
    payload: { purchase_price?: number | null; purchase_date?: string | null }
  ) => api.put(`/portfolio/${id}`, payload),
};
