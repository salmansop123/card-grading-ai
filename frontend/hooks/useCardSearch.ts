"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cardApi } from "@/lib/api";
import { CardSearchResult } from "@/types/card";

export function useCardSearch(query: string) {
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const prevQueryRef = useRef("");

  useEffect(() => {
    const trimmed = query.trim();
    const prev = prevQueryRef.current;
    prevQueryRef.current = trimmed;

    // Paste or large paste-like jumps: search immediately
    const isBulkInput = trimmed.length - prev.length > 2;
    const delay = isBulkInput ? 0 : 300;

    const timer = setTimeout(() => setDebouncedQuery(trimmed), delay);
    return () => clearTimeout(timer);
  }, [query]);

  const enabled = debouncedQuery.length >= 2;

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ["card-search", debouncedQuery],
    queryFn: async () => {
      const { data: results } = await cardApi.search(debouncedQuery);
      return results as CardSearchResult[];
    },
    enabled,
    staleTime: 1000 * 60 * 12,
  });

  return {
    results: data ?? [],
    isLoading: enabled && (isLoading || isFetching),
    isError,
    error,
    debouncedQuery,
  };
}
