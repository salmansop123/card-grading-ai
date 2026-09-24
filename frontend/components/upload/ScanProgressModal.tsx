"use client";

import { Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  open: boolean;
  step: number;
  confidence?: number;
}

const STEPS = ["Uploading image", "AI analyzing card", "Validating identity", "Fetching market prices"];

export function ScanProgressModal({ open, step, confidence }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Analyzing your card...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-3">
              {i < step ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : i === step ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted" />
              )}
              <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </div>
          ))}
          {confidence != null && (
            <p className="pt-2 text-sm text-muted-foreground">Identified with {(confidence * 100).toFixed(0)}% confidence</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
