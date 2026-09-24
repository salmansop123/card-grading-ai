"use client";

import { useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { useCardSearch } from "@/hooks/useCardSearch";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { CardSearchResult } from "@/types/card";

interface Props {
  onSelect: (card: CardSearchResult) => void;
  placeholder?: string;
  initialQuery?: string;
  /** Use "inline" inside modals to avoid nested scrollbars */
  resultsLayout?: "dropdown" | "inline";
  compact?: boolean;
  /** Clear input after selection so user can search again immediately */
  clearOnSelect?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

function rarityBadgeClass(rarity?: string | null) {
  const r = (rarity || "").toLowerCase();
  if (r.includes("secret") || r.includes("ultra") || r.includes("holo rare")) {
    return "bg-purple-100 text-purple-700";
  }
  if (r.includes("rare")) return "bg-blue-100 text-blue-700";
  if (r.includes("uncommon")) return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function CardThumb({ result, width, height }: { result: CardSearchResult; width: number; height: number }) {
  const img = result.thumbnail_url || result.image_url;
  const name = result.card_name || result.name || "?";
  if (img) {
    return (
      <Image
        src={img}
        alt={name}
        width={width}
        height={height}
        className="rounded-lg object-contain"
        style={{ width: "auto", height: "auto", maxWidth: width, maxHeight: height }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-blue-500 font-bold text-white"
      style={{ width, height }}
    >
      {name.charAt(0)}
    </div>
  );
}

function SearchResultRow({
  result,
  onSelect,
}: {
  result: CardSearchResult;
  onSelect: (r: CardSearchResult) => void;
}) {
  const name = result.card_name || result.name!;
  const num = result.card_number || result.number;

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="flex w-full cursor-pointer items-center gap-3 border-b border-card-border px-4 py-3 text-left transition last:border-b-0 hover:bg-amber-50"
    >
      <CardThumb result={result} width={44} height={62} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-card-text">{name}</p>
        <p className="text-sm text-card-text-muted">{result.set_name}</p>
        <p className="text-xs text-card-text-muted">
          #{num}
          {result.rarity ? ` · ${result.rarity}` : ""}
        </p>
      </div>
      {result.rarity && (
        <span
          className={`hidden shrink-0 rounded-full px-2 py-0.5 text-xs font-medium sm:inline ${rarityBadgeClass(result.rarity)}`}
        >
          {result.rarity}
        </span>
      )}
    </button>
  );
}

export function CardSearchAutocomplete({
  onSelect,
  placeholder,
  initialQuery = "",
  resultsLayout = "dropdown",
  compact = false,
  clearOnSelect = false,
  inputRef: externalInputRef,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [showResults, setShowResults] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = externalInputRef ?? internalInputRef;
  const { results, isLoading: searchLoading } = useCardSearch(searchQuery);

  const handleSelect = (result: CardSearchResult) => {
    onSelect(result);
    setShowResults(false);
    setSearchQuery(clearOnSelect ? "" : result.card_name || result.name || "");
  };

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setShowResults(true);
  };

  const inputClass = compact
    ? "w-full rounded-xl border border-card-border py-3 pl-10 pr-10 text-sm focus:border-card-gold focus:outline-none focus:ring-2 focus:ring-card-gold/30"
    : "w-full rounded-2xl border-2 border-card-border py-4 pl-12 pr-12 text-lg focus:border-card-gold focus:outline-none focus:ring-2 focus:ring-card-gold/30";

  const iconLeft = compact ? "left-3.5" : "left-5";
  const iconRight = compact ? "right-3.5" : "right-5";

  const resultsList = showResults && searchQuery.trim().length > 0 && (
    <>
      {searchLoading && results.length === 0 ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : results.length === 0 ? (
        <p className="py-6 text-center text-sm text-card-text-muted">No cards found. Try another name.</p>
      ) : (
        results.map((r) => (
          <SearchResultRow key={r.pokemon_tcg_id || r.id!} result={r} onSelect={handleSelect} />
        ))
      )}
    </>
  );

  if (resultsLayout === "inline") {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="relative shrink-0">
          <span className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-base`}>🔍</span>
          <input
            ref={searchInputRef}
            type="text"
            spellCheck={false}
            autoComplete="off"
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted.trim()) {
                handleInputChange(pasted);
              }
            }}
            onFocus={() => setShowResults(true)}
            placeholder={placeholder ?? "Search by card name..."}
            className={inputClass}
          />
          {searchLoading && (
            <span className={`absolute ${iconRight} top-1/2 -translate-y-1/2`}>
              <LoadingSpinner />
            </span>
          )}
        </div>

        {showResults && searchQuery.trim().length > 0 && (
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-xl border border-card-border bg-white">
            {resultsList}
          </div>
        )}

        {!showResults || searchQuery.trim().length === 0 ? (
          <p className="mt-4 text-center text-sm text-card-text-muted">
            Start typing to search the Pokémon TCG database
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="relative">
      <span className={`absolute ${iconLeft} top-1/2 -translate-y-1/2 text-lg`}>🔍</span>
      <input
        ref={searchInputRef}
        type="text"
        spellCheck={false}
        autoComplete="off"
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          if (pasted.trim()) {
            handleInputChange(pasted);
          }
        }}
        onFocus={() => setShowResults(true)}
        placeholder={placeholder ?? "e.g. Charizard, Pikachu, Blastoise..."}
        className={inputClass}
      />
      {searchLoading && (
        <span className={`absolute ${iconRight} top-1/2 -translate-y-1/2`}>
          <LoadingSpinner />
        </span>
      )}

      {showResults && searchQuery.trim().length > 0 && (
        <div className="absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-card-border bg-white card-shadow">
          {resultsList}
        </div>
      )}
    </div>
  );
}
