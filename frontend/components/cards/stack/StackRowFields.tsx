"use client";

import { useState } from "react";
import { CardCondition, GradingCompany } from "@/types/card";

export const CONDITIONS: CardCondition[] = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
];

const GRADE_PILLS: Record<GradingCompany, number[]> = {
  PSA: [7, 8, 9, 9.5, 10],
  BGS: [8, 8.5, 9, 9.5, 10],
  CGC: [8, 9, 9.5, 10],
  SGC: [8, 9, 9.5, 10],
};

export interface StackRowState {
  tempId: string;
  quantity: number;
  condition: CardCondition | null;
  isGraded: boolean;
  gradingCompany: GradingCompany | null;
  grade: number | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  notes: string;
}

export function createEmptyStackRow(): StackRowState {
  return {
    tempId: crypto.randomUUID(),
    quantity: 1,
    condition: "Near Mint",
    isGraded: false,
    gradingCompany: null,
    grade: null,
    purchasePrice: null,
    purchaseDate: null,
    notes: "",
  };
}

export function isStackValid(stack: StackRowState): boolean {
  if (stack.isGraded) {
    return !!(stack.gradingCompany && stack.grade != null);
  }
  return !!stack.condition;
}

export function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (q: number) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-card-text">Quantity</label>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, quantity - 1))}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-white hover:border-card-gold hover:text-card-gold"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={999}
          value={quantity}
          onChange={(e) => onChange(Math.min(999, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-20 rounded-xl border border-card-border px-4 py-3 text-center focus:outline-none focus:ring-2 focus:ring-card-gold"
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(999, quantity + 1))}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-card-border bg-white hover:border-card-gold hover:text-card-gold"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function ConditionSelector({
  condition,
  onChange,
}: {
  condition: CardCondition | null;
  onChange: (c: CardCondition) => void;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-sm font-medium text-card-text">
        Condition
        <span className="group relative cursor-help text-card-text-muted">
          ⓘ
          <span className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-xl border border-card-border bg-white p-3 text-xs text-card-text-muted shadow-lg group-hover:block">
            Mint (M): Perfect condition, no visible wear
            <br />
            Near Mint (NM): Minimal wear, virtually perfect
            <br />
            Lightly Played (LP): Minor wear on edges or corners
            <br />
            Moderately Played (MP): Noticeable wear, no major damage
            <br />
            Heavily Played (HP): Significant wear throughout
            <br />
            Damaged (D): Major damage affecting playability
          </span>
        </span>
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CONDITIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium ${
              condition === c
                ? "border-card-gold bg-card-gold font-bold text-white"
                : "border-card-border text-card-text-muted hover:border-card-gold"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function GradingSelector({
  isGraded,
  gradingCompany,
  grade,
  onGradedChange,
  onCompanyChange,
  onGradeChange,
}: {
  isGraded: boolean;
  gradingCompany: GradingCompany | null;
  grade: number | null;
  onGradedChange: (graded: boolean) => void;
  onCompanyChange: (co: GradingCompany) => void;
  onGradeChange: (g: number) => void;
}) {
  const company = gradingCompany || "PSA";
  const gradeVal = grade ?? 10;
  const gradeStep = company === "BGS" ? 0.5 : 1;

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-card-text">Professional Grade</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={isGraded}
          onClick={() => onGradedChange(!isGraded)}
          className={`relative h-6 w-12 rounded-full transition-all duration-200 ${
            isGraded ? "bg-card-gold" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
              isGraded ? "left-6" : "left-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-card-text">
          {isGraded ? "Professionally Graded" : "Raw (Ungraded)"}
        </span>
      </div>

      {isGraded && (
        <div className="animate-pop-in mt-4 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {(["PSA", "BGS", "CGC", "SGC"] as GradingCompany[]).map((co) => (
              <button
                key={co}
                type="button"
                onClick={() => {
                  onCompanyChange(co);
                  onGradeChange(10);
                }}
                className={`rounded-xl border px-4 py-3 text-center font-bold ${
                  company === co
                    ? "border-2 border-card-gold bg-amber-50 text-card-gold"
                    : "border-card-border text-card-text-muted hover:border-card-gold"
                }`}
              >
                {co}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Grade</label>
            <input
              type="number"
              min={1}
              max={10}
              step={gradeStep}
              value={gradeVal}
              onChange={(e) => onGradeChange(parseFloat(e.target.value) || 1)}
              className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {GRADE_PILLS[company].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => onGradeChange(g)}
                  className={`rounded-full border px-3 py-1 text-xs ${
                    gradeVal === g
                      ? "border-card-gold bg-card-gold text-white"
                      : "border-card-border hover:border-card-gold"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PurchaseDetailsCollapse({
  purchasePrice,
  purchaseDate,
  onPriceChange,
  onDateChange,
}: {
  purchasePrice: number | null;
  purchaseDate: string | null;
  onPriceChange: (v: number | null) => void;
  onDateChange: (v: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const priceStr = purchasePrice != null ? String(purchasePrice) : "";

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 font-medium text-card-gold"
      >
        💰 Add Purchase Info (for profit tracking)
        <span className={`transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Purchase Price</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-card-text-muted">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={priceStr}
                onChange={(e) =>
                  onPriceChange(e.target.value ? parseFloat(e.target.value) : null)
                }
                className="w-full rounded-xl border border-card-border py-3 pl-8 pr-4 focus:outline-none focus:ring-2 focus:ring-card-gold"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm">Purchase Date</label>
            <input
              type="date"
              max={today}
              value={purchaseDate || ""}
              onChange={(e) => onDateChange(e.target.value || null)}
              className="w-full rounded-xl border border-card-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-card-gold"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StackNotesField({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Notes</label>
      <textarea
        rows={3}
        maxLength={500}
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Where did you get this card? Any special details? e.g. Pulled from pack, bought at local shop, gift from friend..."
        className="w-full rounded-xl border border-card-border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-card-gold"
      />
      <p
        className={`mt-1 text-right text-xs ${
          notes.length > 450 ? "text-red-500" : "text-card-text-muted"
        }`}
      >
        {notes.length} / 500
      </p>
    </div>
  );
}
