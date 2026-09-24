"use client";

import Image from "next/image";
import { Card } from "@/types/card";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  card?: Card;
  confidence?: number;
  onConfirm: () => void;
  onReject: () => void;
}

export function ScanResultPreview({ card, confidence, onConfirm, onReject }: Props) {
  if (!card) return null;

  return (
    <UICard>
      <CardContent className="flex flex-col items-center gap-4 p-6 md:flex-row">
        {card.image_url && (
          <div className="relative h-48 w-36">
            <Image src={card.image_url} alt={card.card_name} fill className="object-contain" unoptimized />
          </div>
        )}
        <div className="flex-1 space-y-2">
          <h3 className="text-xl font-bold">{card.card_name}</h3>
          <p className="text-muted-foreground">
            {card.set_name} #{card.card_number}
          </p>
          {card.rarity && <Badge variant="secondary">{card.rarity}</Badge>}
          {confidence != null && (
            <p className="text-sm">Confidence: {(confidence * 100).toFixed(0)}%</p>
          )}
          <div className="flex gap-2 pt-2">
            <Button onClick={onConfirm}>Add to Portfolio</Button>
            <Button variant="outline" onClick={onReject}>
              Reject
            </Button>
          </div>
        </div>
      </CardContent>
    </UICard>
  );
}
