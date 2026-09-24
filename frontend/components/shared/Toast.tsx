"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string | null;
  onClear: () => void;
  durationMs?: number;
}

export function Toast({ message, onClear, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClear, durationMs);
    return () => clearTimeout(timer);
  }, [message, onClear, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 animate-pop-in rounded-xl border border-card-border bg-white px-5 py-3 text-sm font-medium text-card-text card-shadow">
      {message}
    </div>
  );
}
