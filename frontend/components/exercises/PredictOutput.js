"use client";

import { useMemo } from "react";
import { shuffled } from "@/lib/shuffle";

/* Predict output — snippet + choose or type. Reuses multiple_choice styling.
   Options are seeded-shuffled per exercise; value is the option string,
   so checking needs no changes. */

export function PredictOutput({ exercise, value, onChange, showResult }) {
  const snippet = exercise.content?.snippet ?? "";
  const opts = exercise.content?.options ?? null;
  const answer = exercise.solution?.answer ?? "";
  const isCorrect = showResult ? String(value).trim() === String(answer).trim() : null;

  const displayOpts = useMemo(() => {
    const list = exercise.content?.options ?? null;
    return list ? shuffled(list, `predict:${String(exercise?._id ?? exercise?.prompt ?? "")}`) : null;
  }, [exercise]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-body text-[19px] font-bold leading-[1.4] text-ink">{exercise.prompt}</h2>

      <div className="overflow-hidden rounded-[12px] border-2 border-dim-steel bg-night">
        <div className="border-b-2 border-dim-steel bg-dim-steel/10 px-4 py-2">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.04em] text-steel">Code</p>
        </div>
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.6] text-ink">
          <code>{snippet}</code>
        </pre>
      </div>

      {opts ? (
        <div className="flex flex-col gap-2">
          {displayOpts.map((opt) => {
            const selected = value === opt;
            const isRight = showResult && opt === answer;
            const isWrong = showResult && selected && opt !== answer;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => !showResult && onChange(opt)}
                aria-pressed={selected}
                disabled={showResult}
                className={
                  isRight
                    ? "w-full rounded-[12px] border-2 border-nex-blue bg-soft-violet px-4 py-3 text-left font-mono text-[14px] font-bold text-ink"
                    : isWrong
                      ? "w-full rounded-[12px] border-2 border-destructive bg-destructive/10 px-4 py-3 text-left font-mono text-[14px] font-bold text-destructive"
                      : selected
                        ? "w-full rounded-[12px] border-2 border-nex-blue bg-night px-4 py-3 text-left font-mono text-[14px] font-bold text-ink shadow-[0_2px_0_var(--color-nex-blue)]"
                        : "w-full rounded-[12px] border-2 border-dim-steel bg-night px-4 py-3 text-left font-mono text-[14px] font-medium text-ink hover:border-graphite"
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="font-body text-[14px] font-bold text-ink">Your answer</label>
          <input
            value={value ?? ""}
            onChange={(e) => !showResult && onChange(e.target.value)}
            disabled={showResult}
            placeholder="Type the output"
            className="h-[44px] w-full rounded-[12px] border-2 border-dim-steel bg-night px-4 font-mono text-[14px] text-ink placeholder:text-steel/60 outline-none focus:border-electric-cyan disabled:opacity-60"
          />
        </div>
      )}

      {showResult ? (
        <p
          className={
            isCorrect
              ? "rounded-[12px] border-2 border-nex-blue bg-soft-violet px-4 py-3 font-body text-[14px] font-bold text-ink"
              : "rounded-[12px] border-2 border-destructive/30 bg-destructive/10 px-4 py-3 font-body text-[14px] font-bold text-destructive"
          }
        >
          {isCorrect ? "Got it!" : `Output is: ${answer}.`} {exercise.explanation}
        </p>
      ) : null}
    </div>
  );
}
