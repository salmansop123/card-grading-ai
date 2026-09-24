"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/api";
import { ScanStatus } from "@/types/card";

export function useCardScan() {
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async (scanId: string): Promise<ScanStatus> => {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const { data } = await api.get<ScanStatus>(`/cards/scan/${scanId}/status`);
      setScanStatus(data);

      if (["complete", "success", "requires_confirmation", "low_confidence", "failed"].includes(data.status)) {
        return data;
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("Scan timed out");
  }, []);

  const scanCard = useCallback(
    async (file: File, cardTypeHint?: string) => {
      setScanning(true);
      setError(null);
      setScanStatus(null);

      try {
        const formData = new FormData();
        formData.append("image", file);
        if (cardTypeHint) formData.append("card_type_hint", cardTypeHint);

        const { data: initData } = await api.post<{ scan_id: string; status: string }>("/cards/scan", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const result = await pollStatus(initData.scan_id);
        return { ...result, scan_id: initData.scan_id };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Scan failed";
        setError(message);
        throw err;
      } finally {
        setScanning(false);
      }
    },
    [pollStatus]
  );

  const confirmScan = useCallback(async (scanId: string) => {
    const { data } = await api.post(`/cards/scan/${scanId}/confirm`);
    return data;
  }, []);

  return { scanCard, confirmScan, scanning, scanStatus, error };
}
