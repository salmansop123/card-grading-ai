"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CardSearchAutocomplete } from "@/components/cards/CardSearchAutocomplete";
import {
  ConditionSelector,
  createEmptyStackRow,
  GradingSelector,
  isStackValid,
  PurchaseDetailsCollapse,
  QuantityStepper,
  StackNotesField,
  StackRowState,
} from "@/components/cards/stack/StackRowFields";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useBatchAddCards } from "@/hooks/useBatchAddCards";
import { useRemoveFromWishlist } from "@/hooks/useWishlist";
import { portfolioApi } from "@/lib/api";
import { PortfolioHolding } from "@/types/portfolio";
import {
  BatchAddRequest,
  BatchAddResponse,
  CardSearchResult,
} from "@/types/card";

interface CartCard {
  tempId: string;
  pokemonTcgId: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  imageUrl: string | null;
  rarity: string | null;
  stacks: StackRowState[];
}

function cartCardFromSearch(result: CardSearchResult): CartCard {
  return {
    tempId: crypto.randomUUID(),
    pokemonTcgId: result.pokemon_tcg_id || result.id!,
    cardName: result.card_name || result.name || "Unknown",
    setName: result.set_name || "",
    cardNumber: result.card_number || result.number || "",
    imageUrl: result.thumbnail_url || result.image_url || null,
    rarity: result.rarity ?? null,
    stacks: [createEmptyStackRow()],
  };
}

function CartThumb({
  imageUrl,
  name,
  size = "md",
}: {
  imageUrl: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const w = size === "sm" ? 40 : 56;
  const h = size === "sm" ? 56 : 78;
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={name}
        width={w}
        height={h}
        className="shrink-0 rounded-lg object-contain"
        style={{ width: w, height: h }}
        unoptimized
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-400 to-blue-500 font-bold text-white"
      style={{ width: w, height: h }}
    >
      {name.charAt(0)}
    </div>
  );
}

function StackRowCard({
  stack,
  stackIndex,
  canRemove,
  onChange,
  onRemove,
}: {
  stack: StackRowState;
  stackIndex: number;
  canRemove: boolean;
  onChange: (patch: Partial<StackRowState>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative mb-3 rounded-xl border border-card-border bg-white p-4">
      {canRemove && (
        <button
          type="button"
          className="absolute right-2 top-2 text-card-text-muted hover:text-card-red"
          onClick={onRemove}
          aria-label={`Remove copy ${stackIndex + 1}`}
        >
          ✕
        </button>
      )}

      <div className="space-y-6">
        <QuantityStepper
          quantity={stack.quantity}
          onChange={(q) => onChange({ quantity: q })}
        />

        <GradingSelector
          isGraded={stack.isGraded}
          gradingCompany={stack.gradingCompany}
          grade={stack.grade}
          onGradedChange={(graded) =>
            onChange({
              isGraded: graded,
              gradingCompany: graded ? stack.gradingCompany || "PSA" : null,
              grade: graded ? stack.grade ?? 10 : null,
              condition: graded ? null : stack.condition || "Near Mint",
            })
          }
          onCompanyChange={(co) => onChange({ gradingCompany: co })}
          onGradeChange={(g) => onChange({ grade: g })}
        />

        {!stack.isGraded && (
          <ConditionSelector
            condition={stack.condition}
            onChange={(c) => onChange({ condition: c })}
          />
        )}

        <PurchaseDetailsCollapse
          purchasePrice={stack.purchasePrice}
          purchaseDate={stack.purchaseDate}
          onPriceChange={(v) => onChange({ purchasePrice: v })}
          onDateChange={(v) => onChange({ purchaseDate: v })}
        />

        <StackNotesField notes={stack.notes} onChange={(v) => onChange({ notes: v })} />
      </div>
    </div>
  );
}

export function ManualAddCardForm({
  initialSelected,
  wishlistItemIdToRemove,
}: {
  initialSelected?: CardSearchResult | null;
  wishlistItemIdToRemove?: string | null;
}) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchSectionRef = useRef<HTMLDivElement>(null);

  const [cart, setCart] = useState<CartCard[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [existingHoldings, setExistingHoldings] = useState<PortfolioHolding[]>([]);
  const [submitResponse, setSubmitResponse] = useState<BatchAddResponse | null>(null);
  const [removeCartIndex, setRemoveCartIndex] = useState<number | null>(null);

  const batchAdd = useBatchAddCards();
  const removeFromWishlist = useRemoveFromWishlist();

  const activeCard = activeCardIndex != null ? cart[activeCardIndex] : null;

  const totals = useMemo(() => {
    let totalStacks = 0;
    let totalQty = 0;
    for (const c of cart) {
      totalStacks += c.stacks.length;
      totalQty += c.stacks.reduce((s, row) => s + row.quantity, 0);
    }
    return { totalStacks, totalQty };
  }, [cart]);

  const allStacksValid = useMemo(
    () => cart.length > 0 && cart.every((c) => c.stacks.every(isStackValid)),
    [cart]
  );

  const resetCart = useCallback(() => {
    setCart([]);
    setActiveCardIndex(null);
    setExistingHoldings([]);
    setSubmitResponse(null);
    setRemoveCartIndex(null);
    batchAdd.reset();
  }, [batchAdd]);

  const initFromSearch = useCallback((result: CardSearchResult) => {
    const tcgId = result.pokemon_tcg_id || result.id!;
    setCart((prev) => {
      const existingIdx = prev.findIndex((c) => c.pokemonTcgId === tcgId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          stacks: [...next[existingIdx].stacks, createEmptyStackRow()],
        };
        setActiveCardIndex(existingIdx);
        return next;
      }
      const entry = cartCardFromSearch(result);
      setActiveCardIndex(prev.length);
      return [...prev, entry];
    });
  }, []);

  useEffect(() => {
    if (initialSelected?.pokemon_tcg_id || initialSelected?.id) {
      const entry = cartCardFromSearch(initialSelected);
      setCart([entry]);
      setActiveCardIndex(0);
    }
  }, [initialSelected]);

  useEffect(() => {
    if (!activeCard?.pokemonTcgId) {
      setExistingHoldings([]);
      return;
    }
    portfolioApi
      .getHoldingsForCard(activeCard.pokemonTcgId)
      .then(({ data }) => setExistingHoldings(data))
      .catch(() => setExistingHoldings([]));
  }, [activeCard?.pokemonTcgId]);

  const handleSearchSelect = (result: CardSearchResult) => {
    initFromSearch(result);
  };

  const updateStack = (cardIdx: number, stackIdx: number, patch: Partial<StackRowState>) => {
    setCart((prev) =>
      prev.map((c, ci) =>
        ci !== cardIdx
          ? c
          : {
              ...c,
              stacks: c.stacks.map((s, si) => (si !== stackIdx ? s : { ...s, ...patch })),
            }
      )
    );
  };

  const addStackToActive = () => {
    if (activeCardIndex == null) return;
    setCart((prev) =>
      prev.map((c, i) =>
        i !== activeCardIndex ? c : { ...c, stacks: [...c.stacks, createEmptyStackRow()] }
      )
    );
  };

  const removeStack = (cardIdx: number, stackIdx: number) => {
    setCart((prev) =>
      prev.map((c, ci) =>
        ci !== cardIdx ? c : { ...c, stacks: c.stacks.filter((_, si) => si !== stackIdx) }
      )
    );
  };

  const cartHasPurchaseData = (card: CartCard) =>
    card.stacks.some((s) => s.purchasePrice != null || s.purchaseDate);

  const removeCartCard = (index: number) => {
    setCart((prev) => {
      const next = prev.filter((_, i) => i !== index);
      setActiveCardIndex((ai) => {
        if (ai == null) return null;
        if (ai === index) return next.length ? Math.min(index, next.length - 1) : null;
        if (ai > index) return ai - 1;
        return ai;
      });
      return next;
    });
    setRemoveCartIndex(null);
  };

  const handleRemoveCartClick = (index: number) => {
    if (cartHasPurchaseData(cart[index])) {
      setRemoveCartIndex(index);
    } else {
      removeCartCard(index);
    }
  };

  const buildPayload = (): BatchAddRequest => ({
    cards: cart.map((card) => ({
      pokemon_tcg_id: card.pokemonTcgId,
      stacks: card.stacks.map((stack) => ({
        quantity: stack.quantity,
        condition: stack.isGraded ? null : stack.condition,
        is_graded: stack.isGraded,
        grading_company: stack.isGraded ? stack.gradingCompany : null,
        grade: stack.isGraded ? stack.grade : null,
        purchase_price: stack.purchasePrice,
        purchase_date: stack.purchaseDate,
        notes: stack.notes.trim() || null,
      })),
    })),
  });

  const handleSubmit = async () => {
    if (!allStacksValid) return;
    try {
      const response = await batchAdd.mutateAsync(buildPayload());
      if (wishlistItemIdToRemove) {
        await removeFromWishlist.mutateAsync(wishlistItemIdToRemove);
      }
      setSubmitResponse(response);
    } catch {
      // mutation error surfaced via batchAdd.isError if needed
    }
  };

  const focusSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    searchInputRef.current?.focus();
  };

  if (submitResponse) {
    const r = submitResponse;
    return (
      <div className="rounded-2xl border border-card-border bg-white p-8 text-center card-shadow md:p-10">
        <div className="mb-4 text-7xl">🎉</div>
        <h2 className="mb-2 font-black text-2xl text-card-text">
          {r.success_count} Card{r.success_count !== 1 ? "s" : ""} Added to Your Collection!
        </h2>

        {r.error_count > 0 && (
          <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-left">
            <p className="mb-2 font-medium text-red-700">
              {r.error_count} card{r.error_count !== 1 ? "s" : ""} couldn&apos;t be added:
            </p>
            {r.errors.map((err) => (
              <p key={err.pokemon_tcg_id} className="text-sm text-card-text-muted">
                • {err.error}
              </p>
            ))}
          </div>
        )}

        <div className="my-6 grid grid-cols-3 gap-3 md:grid-cols-5">
          {r.results.map((item) => (
            <div key={item.card_id} className="text-center">
              <CartThumb imageUrl={item.image_url ?? null} name={item.card_name} size="sm" />
              <p className="mt-1 truncate text-xs font-medium text-card-text">{item.card_name}</p>
              {item.estimated_value != null && (
                <p className="text-xs font-bold text-card-gold">
                  ${item.estimated_value.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" className="btn-primary" onClick={() => router.push("/vault")}>
            View in Vault →
          </button>
          <button type="button" className="btn-secondary" onClick={resetCart}>
            Add More Cards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-28">
      {batchAdd.isPending && (
        <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm">
          <div className="text-center">
            <LoadingSpinner />
            <p className="mt-3 font-medium text-card-text">
              Adding {totals.totalQty} card{totals.totalQty !== 1 ? "s" : ""}...
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,340px)_1fr]">
        {/* LEFT: search + cart */}
        <div ref={searchSectionRef} className="space-y-4">
          <div>
            <h2 className="mb-1 font-bold text-lg text-card-text">Search cards</h2>
            <p className="mb-3 text-sm text-card-text-muted">
              Find cards and build your stack stay on this screen the whole time
            </p>
            <CardSearchAutocomplete
              onSelect={handleSearchSelect}
              clearOnSelect
              inputRef={searchInputRef}
              placeholder="e.g. Charizard, Pikachu, Greninja..."
            />
          </div>

          <div>
            <h3 className="mb-2 font-bold text-card-text">
              Your Cart ({cart.length} card{cart.length !== 1 ? "s" : ""})
            </h3>

            {cart.length === 0 ? (
              <p className="rounded-xl border border-dashed border-card-border p-6 text-center text-sm text-card-text-muted">
                Search for a card above to start building your cart
              </p>
            ) : (
              <>
                {/* Mobile: horizontal scroll strip */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
                  {cart.map((card, index) => {
                    const qty = card.stacks.reduce((s, r) => s + r.quantity, 0);
                    const active = index === activeCardIndex;
                    return (
                      <button
                        key={card.tempId}
                        type="button"
                        onClick={() => setActiveCardIndex(index)}
                        className={`relative shrink-0 rounded-xl border p-2 transition ${
                          active
                            ? "border-card-gold bg-amber-50 ring-2 ring-card-gold/30"
                            : "border-card-border bg-white"
                        }`}
                      >
                        <CartThumb imageUrl={card.imageUrl} name={card.cardName} size="sm" />
                        <p className="mt-1 max-w-[72px] truncate text-[10px] font-medium">
                          {card.cardName}
                        </p>
                        <p className="text-[9px] text-card-text-muted">
                          {card.stacks.length}v · ×{qty}
                        </p>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCartClick(index);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.stopPropagation();
                              handleRemoveCartClick(index);
                            }
                          }}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow hover:text-card-red"
                        >
                          ×
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Desktop: vertical list */}
                <div className="hidden space-y-2 md:block">
                  {cart.map((card, index) => {
                    const qty = card.stacks.reduce((s, r) => s + r.quantity, 0);
                    const active = index === activeCardIndex;
                    return (
                      <div
                        key={card.tempId}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                          active
                            ? "border-l-4 border-l-card-gold border-card-gold bg-amber-50"
                            : "border-card-border bg-white hover:border-card-gold/50"
                        }`}
                        onClick={() => setActiveCardIndex(index)}
                        onKeyDown={(e) => e.key === "Enter" && setActiveCardIndex(index)}
                        role="button"
                        tabIndex={0}
                      >
                        <CartThumb imageUrl={card.imageUrl} name={card.cardName} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-card-text">
                            {card.cardName}
                          </p>
                          <p className="truncate text-xs text-card-text-muted">{card.setName}</p>
                          <p className="text-xs text-card-text-muted">
                            {card.stacks.length} version{card.stacks.length !== 1 ? "s" : ""} ·{" "}
                            {qty} total
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCartClick(index);
                          }}
                          className="shrink-0 text-card-text-muted hover:text-card-red"
                          aria-label="Remove from cart"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: stack editor */}
        <div className="min-h-[200px] rounded-2xl border border-card-border bg-white p-5 card-shadow md:p-6">
          {!activeCard ? (
            <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center text-card-text-muted">
              <p className="text-4xl">🃏</p>
              <p className="mt-3 text-sm">Select a card from your cart to edit its copies</p>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-start gap-4 rounded-xl border border-card-border bg-amber-50/50 p-4">
                <CartThumb imageUrl={activeCard.imageUrl} name={activeCard.cardName} />
                <div className="min-w-0">
                  <h3 className="font-black text-xl text-card-text">{activeCard.cardName}</h3>
                  <p className="text-sm text-card-text-muted">
                    {activeCard.setName}
                    {activeCard.cardNumber ? ` · #${activeCard.cardNumber}` : ""}
                  </p>
                  {activeCard.rarity && (
                    <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {activeCard.rarity}
                    </span>
                  )}
                </div>
              </div>

              {existingHoldings.length > 0 && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-2 text-sm font-medium text-card-text">
                    📋 You already own {existingHoldings.length} version
                    {existingHoldings.length > 1 ? "s" : ""} of this card:
                  </p>
                  <div className="space-y-1">
                    {existingHoldings.map((h) => (
                      <div
                        key={h.holding_id}
                        className="flex justify-between text-xs text-card-text-muted"
                      >
                        <span>
                          {h.is_graded && h.grading_company
                            ? `${h.grading_company} ${h.grade}`
                            : h.condition}
                        </span>
                        <span className="font-medium">× {h.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="mb-4 font-bold text-lg text-card-text">Your Copies of This Card</h4>

              {activeCard.stacks.map((stack, stackIdx) => (
                <StackRowCard
                  key={stack.tempId}
                  stack={stack}
                  stackIndex={stackIdx}
                  canRemove={activeCard.stacks.length > 1}
                  onChange={(patch) =>
                    activeCardIndex != null && updateStack(activeCardIndex, stackIdx, patch)
                  }
                  onRemove={() =>
                    activeCardIndex != null && removeStack(activeCardIndex, stackIdx)
                  }
                />
              ))}

              <button
                type="button"
                onClick={addStackToActive}
                className="btn-secondary w-full border-dashed"
              >
                + Add Another Copy (Different Condition/Grade)
              </button>
              <p className="mt-2 text-center text-xs text-card-text-muted">
                Use this if you own this same card in a different condition, or have both raw and
                graded copies
              </p>
            </>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 z-30 -mx-5 mt-6 border-t border-card-border bg-white/95 px-5 py-3 shadow-lg backdrop-blur-md md:-mx-6 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-card-text sm:text-left">
            🗂️ {cart.length} card{cart.length !== 1 ? "s" : ""} · {totals.totalStacks} version
            {totals.totalStacks !== 1 ? "s" : ""} · {totals.totalQty} total cards
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-secondary" onClick={focusSearch}>
              Search Another Card
            </button>
            <button
              type="button"
              disabled={!allStacksValid || batchAdd.isPending}
              onClick={handleSubmit}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {totals.totalQty} Card{totals.totalQty !== 1 ? "s" : ""} to Vault →
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={removeCartIndex != null}
        title="Remove this card from your cart?"
        message="This card has purchase info entered. Removing it will discard those details."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => removeCartIndex != null && removeCartCard(removeCartIndex)}
        onCancel={() => setRemoveCartIndex(null)}
      />
    </div>
  );
}
