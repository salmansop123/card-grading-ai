"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImageDropzone } from "@/components/upload/ImageDropzone";
import { ScanProgressModal } from "@/components/upload/ScanProgressModal";
import { ScanResultPreview } from "@/components/upload/ScanResultPreview";
import { ManualAddCardForm } from "@/components/cards/ManualAddCardForm";
import { useCardScan } from "@/hooks/useCardScan";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CardSearchResult } from "@/types/card";

const AI_UNAVAILABLE_MESSAGE =
  "AI scanning is currently unavailable. Use the manual search below to add cards by name.";

function UploadScanSection({ onAiUnavailable }: { onAiUnavailable: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const { scanCard, confirmScan, scanning, scanStatus } = useCardScan();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleScan = async () => {
    if (!file) return;
    try {
      const result = await scanCard(file, "pokemon");
      if (result.scan_id) {
        setScanId(result.scan_id);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 503) {
        const data = err.response.data as { code?: string };
        if (data?.code === "AI_UNAVAILABLE") {
          onAiUnavailable();
          return;
        }
      }
    }
  };

  const handleConfirm = async () => {
    if (!scanStatus?.card && !scanId) return;
    try {
      if (scanStatus?.status === "requires_confirmation" && scanId) {
        const { data: card } = await confirmScan(scanId);
        await api.post("/portfolio/add", { card_id: (card as { id: string }).id });
      } else if (scanStatus?.card) {
        await api.post("/portfolio/add", { card_id: scanStatus.card.id });
      }
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      router.push("/dashboard");
    } catch {
      router.push("/dashboard");
    }
  };

  const step = scanning ? 1 : scanStatus ? 3 : 0;

  return (
    <div className="space-y-4">
      <ImageDropzone onFileSelect={setFile} />

      {file && !scanStatus && (
        <Button onClick={handleScan} disabled={scanning} className="w-full">
          {scanning ? "Scanning..." : "Scan Card"}
        </Button>
      )}

      <ScanProgressModal open={scanning} step={step} confidence={scanStatus?.confidence} />

      {scanStatus?.card && (
        <ScanResultPreview
          card={scanStatus.card}
          confidence={scanStatus.confidence}
          onConfirm={handleConfirm}
          onReject={() => {
            setFile(null);
            window.location.reload();
          }}
        />
      )}

      {scanStatus?.error_message && (
        <p className="text-sm text-destructive">{scanStatus.error_message}</p>
      )}
    </div>
  );
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const [aiUnavailableBanner, setAiUnavailableBanner] = useState<string | null>(null);
  const [prefillCard, setPrefillCard] = useState<CardSearchResult | null>(null);
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null);

  useEffect(() => {
    const prefillId = searchParams.get("prefill");
    const wlId = searchParams.get("wishlistItemId");
    if (wlId) setWishlistItemId(wlId);

    const raw = sessionStorage.getItem("manualAddPrefill");
    if (raw) {
      sessionStorage.removeItem("manualAddPrefill");
      try {
        const data = JSON.parse(raw);
        if (data.wishlist_item_id) setWishlistItemId(data.wishlist_item_id);
        setPrefillCard({
          pokemon_tcg_id: data.pokemon_tcg_id,
          card_name: data.card_name,
          set_name: data.set_name,
          card_number: data.card_number,
          image_url: data.image_url,
          thumbnail_url: data.thumbnail_url,
          rarity: data.rarity,
          year: data.year,
        });
        return;
      } catch {
        // fall through
      }
    }

    if (prefillId) {
      setPrefillCard({
        pokemon_tcg_id: prefillId,
        card_name: "",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!prefillCard && !searchParams.get("prefill") && searchParams.get("tab") !== "manual") return;
    const el = document.getElementById("manual-add");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [prefillCard, searchParams]);

  return (
    <div className="relative mx-auto max-w-6xl space-y-8 pb-8">
      <div className="text-center">
        <h1 className="font-black text-2xl text-card-text md:text-3xl">Add a Card</h1>
        <p className="mt-2 text-sm text-card-text-muted">
          Upload a photo for AI identification, or search the database and enter ownership details —
          all on this page.
        </p>
      </div>

      {aiUnavailableBanner && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900"
        >
          {aiUnavailableBanner}
        </div>
      )}

      <section className="rounded-2xl border border-card-border bg-white p-6 card-shadow">
        <div className="mb-4">
          <h2 className="font-bold text-lg text-card-text">📷 Scan from photo</h2>
          <p className="mt-1 text-sm text-card-text-muted">
            Upload a photo of your Pokémon card for automatic AI identification
          </p>
        </div>
        <UploadScanSection onAiUnavailable={() => setAiUnavailableBanner(AI_UNAVAILABLE_MESSAGE)} />
      </section>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-card-border" />
        <span className="shrink-0 text-sm font-medium text-card-text-muted">or add manually</span>
        <div className="h-px flex-1 bg-card-border" />
      </div>

      <section id="manual-add" className="scroll-mt-6">
        <div className="mb-4">
          <h2 className="font-bold text-lg text-card-text">✏️ Add by card name</h2>
          <p className="mt-1 text-sm text-card-text-muted">
            Search the Pokémon TCG database, stack multiple conditions/grades per card, and add
            everything in one go
          </p>
        </div>
        <ManualAddCardForm
          initialSelected={prefillCard}
          wishlistItemIdToRemove={wishlistItemId}
        />
      </section>
    </div>
  );
}
