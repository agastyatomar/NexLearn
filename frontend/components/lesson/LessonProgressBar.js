"use client";

/* Progress bar — Duolingo-style with Eager Green fill.
   Uses transitions-dev 01-card-resize for width tween. */

export function LessonProgressBar({ current, total }) {
  const pct = total ? Math.round((current / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-dim-steel/20">
        <div
          className="h-full rounded-full bg-nex-blue transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)]"
          style={{ width: `${pct}%`, willChange: "width" }}
        />
      </div>
      <span className="font-body text-[13px] font-bold tabular-nums text-steel">
        {current}/{total}
      </span>
    </div>
  );
}
