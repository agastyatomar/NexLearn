"use client";

import { useMemo, useState } from "react";
import { shuffled } from "@/lib/shuffle";

/* Arrange — tap to order lines. Blocks are seeded-shuffled per exercise
   (stable mid-lesson), so left-to-right tapping never wins by itself. */

export function ArrangeBlocks({ exercise, value, onChange, showResult }) {
  const blocks = exercise.content?.blocks ?? [];
  const solutionOrder = exercise.solution?.order ?? blocks.map((_, i) => i);
  const ordered = value ?? [];
  const isCorrect = showResult ? JSON.stringify(ordered) === JSON.stringify(solutionOrder) : null;

  // Full pool shuffled once per exercise — filter chosen, never reshuffle
  const pool = useMemo(() => {
    const list = exercise.content?.blocks ?? [];
    return shuffled(
      list.map((_, i) => i),
      `arrange:${String(exercise?._id ?? exercise?.prompt ?? "")}`,
    );
  }, [exercise]);
  const available = pool.filter((i) => !ordered.includes(i));

  function toggle(idx) {
    if (showResult) return;
    if (ordered.includes(idx)) {
      onChange(ordered.filter((x) => x !== idx));
    } else {
      onChange([...ordered, idx]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-body text-[19px] font-bold leading-[1.4] text-ink">{exercise.prompt}</h2>

      <div className="rounded-[12px] border-2 border-dim-steel bg-night p-4">
        <p className="font-body text-[13px] font-bold uppercase tracking-[0.053em] text-steel">Your order</p>
        <div className="mt-2 flex min-h-[88px] flex-col gap-2">
          {ordered.length === 0 ? (
            <p className="rounded-[12px] border-2 border-dashed border-dim-steel bg-dim-steel/10 px-4 py-6 text-center font-body text-[14px] font-medium text-steel">
              Tap blocks below to build the answer
            </p>
          ) : (
            ordered.map((idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggle(idx)}
                disabled={showResult}
                className="w-full rounded-[12px] border-2 border-nex-blue bg-soft-violet px-4 py-2.5 text-left font-mono text-[13px] font-medium leading-[1.5] text-ink transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]"
              >
                {blocks[idx]}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => toggle(idx)}
            disabled={showResult}
            className="rounded-[12px] border-2 border-dim-steel bg-night px-4 py-2 font-mono text-[13px] font-medium text-ink transition-colors hover:border-graphite disabled:opacity-60"
          >
            {blocks[idx]}
          </button>
        ))}
        {available.length === 0 && !showResult ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-[12px] border-2 border-dim-steel bg-night px-4 py-2 font-body text-[13px] font-bold text-steel hover:border-graphite"
          >
            Clear
          </button>
        ) : null}
      </div>

      {showResult ? (
        <p
          className={
            isCorrect
              ? "rounded-[12px] border-2 border-nex-blue bg-soft-violet px-4 py-3 font-body text-[14px] font-bold text-ink"
              : "rounded-[12px] border-2 border-destructive/30 bg-destructive/10 px-4 py-3 font-body text-[14px] font-bold text-destructive"
          }
        >
          {isCorrect ? "Perfect order!" : "Check the order."} {exercise.explanation}
        </p>
      ) : null}
    </div>
  );
}
