"use client";

import Link from "next/link";
import { createElement } from "react";
import { Lock, Check, Play, RotateCcw, Code2, Layers, GraduationCap, Rocket, Trophy, Clock } from "lucide-react";

const ICONS = {
  variables: Code2,
  loops: RotateCcw,
  functions: Layers,
  default: Code2,
};

function getIcon(title) {
  const t = String(title).toLowerCase();
  if (t.includes("variable")) return Code2;
  if (t.includes("loop")) return RotateCcw;
  if (t.includes("function")) return Layers;
  if (t.includes("array")) return Layers;
  if (t.includes("intro")) return GraduationCap;
  if (t.includes("final") || t.includes("project")) return Rocket;
  return Code2;
}

export function LessonCard({ lesson, status, draft, index, totalInUnit, unitTitle }) {
  const isLocked = status === "locked";
  const isCompleted = status === "completed";
  const isAvailable = status === "available";
  const hasDraft = !!draft && draft.idx > 0;
  const isContinue = isAvailable && hasDraft;
  // draft progress: idx is 0-based current exercise
  const draftProgress = draft ? Math.round(((draft.idx + 1) / (draft.total || 1)) * 100) : 0;
  const href = isLocked ? "#" : `/app/learn/${String(lesson._id)}`;
  const lessonNumber = typeof index === "number" ? index + 1 : 1;

  // card styles per status — follows DESIGN.md (Paper White, 12px radius, 2px border)
  const cardBase = "relative flex h-full flex-col overflow-hidden rounded-[16px] border-2 bg-night p-4 transition-all duration-200";
  let cardStyle = "";
  let badge = null;
  let cta = null;

  if (isLocked) {
    cardStyle = "border-dim-steel/40 bg-dim-steel/10 opacity-75";
    badge = (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-dim-steel bg-dim-steel/20 px-2.5 py-1 font-body text-[10px] font-black uppercase tracking-[0.05em] text-steel">
        <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        Locked
      </span>
    );
    cta = (
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-dim-steel bg-dim-steel/15 px-4 py-2.5 font-body text-[13px] font-bold text-steel">
        <Lock className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Locked
      </span>
    );
  } else if (isCompleted) {
    cardStyle = "border-nex-blue bg-soft-violet/30 hover:border-nex-blue hover:shadow-[0_4px_0_var(--color-nex-blue-deep)] hover:-translate-y-[1px]";
    badge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-nex-blue px-2.5 py-1 font-body text-[10px] font-black uppercase tracking-[0.05em] text-snow">
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
        Completed
      </span>
    );
    cta = (
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-nex-blue bg-night px-4 py-2.5 font-body text-[13px] font-bold text-nex-blue shadow-[0_3px_0_var(--color-nex-blue-deep)]">
        <Trophy className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
        View
      </span>
    );
  } else if (isContinue) {
    cardStyle = "border-electric-cyan bg-[#e6f4ff]/40 hover:border-electric-cyan hover:shadow-[0_4px_0_var(--color-electric-cyan)] hover:-translate-y-[1px]";
    badge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-electric-cyan px-2.5 py-1 font-body text-[10px] font-black uppercase tracking-[0.05em] text-snow">
        <Play className="h-3 w-3 fill-snow" strokeWidth={2.5} aria-hidden="true" />
        Continue
      </span>
    );
    cta = (
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-electric-cyan bg-electric-cyan px-4 py-2.5 font-body text-[13px] font-bold text-snow shadow-[0_3px_0_#0a8ac2]">
        <Play className="h-4 w-4 fill-snow" strokeWidth={2.5} aria-hidden="true" />
        Continue · {draft.idx + 1}/{draft.total || "?"}
      </span>
    );
  } else {
    // Start
    cardStyle = "border-dim-steel bg-night hover:border-graphite hover:shadow-[0_4px_0_var(--color-charcoal)] hover:-translate-y-[1px]";
    badge = (
      <span className="inline-flex items-center gap-1 rounded-full bg-graphite px-2.5 py-1 font-body text-[10px] font-black uppercase tracking-[0.05em] text-snow">
        <Play className="h-3 w-3 fill-snow" strokeWidth={2.5} aria-hidden="true" />
        Start
      </span>
    );
    cta = (
      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-[12px] border-2 border-nex-blue bg-nex-blue px-4 py-2.5 font-body text-[13px] font-bold text-snow shadow-[0_3px_0_var(--color-nex-blue-deep)]">
        <Play className="h-4 w-4 fill-snow" strokeWidth={2.5} aria-hidden="true" />
        Start lesson
      </span>
    );
  }

  const CardInner = (
    <div className={`${cardBase} ${cardStyle}`}>
      {/* Top row: number + xp + status — number now XL per feedback */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-[3px] text-[22px] font-black leading-none shadow-[0_3px_0_rgba(0,0,0,0.10)] sm:h-[60px] sm:w-[60px] sm:rounded-[16px] sm:text-[24px] sm:border-[3px] ${isCompleted ? "border-nex-blue bg-nex-blue text-snow shadow-[0_3px_0_var(--color-nex-blue-deep)]" : isLocked ? "border-dim-steel bg-dim-steel/15 text-steel" : isContinue ? "border-electric-cyan bg-electric-cyan text-snow shadow-[0_3px_0_#0a8ac2]" : "border-graphite bg-graphite text-snow shadow-[0_3px_0_rgba(0,0,0,0.20)]"}`}>
            {isCompleted ? <Check className="h-7 w-7 sm:h-7 sm:w-7" strokeWidth={3} aria-hidden="true" /> : lessonNumber}
          </span>
          <span className="inline-flex items-center rounded-full bg-dim-steel/15 px-2.5 py-1 font-body text-[11px] font-bold leading-none text-steel">
            {lesson.xpReward ?? 10} XP
          </span>
        </div>
        {badge}
      </div>

      {/* Icon + title */}
      <div className="mt-3 flex gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-2 ${isLocked ? "border-dim-steel bg-dim-steel/10 text-steel" : isCompleted ? "border-nex-blue bg-nex-blue text-snow" : isContinue ? "border-electric-cyan bg-electric-cyan text-snow" : "border-dim-steel bg-night text-ink"}`}>
          {createElement(getIcon(lesson.title), { className: "h-5 w-5", strokeWidth: 2, "aria-hidden": true })}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-body text-[15px] font-black leading-[1.2] text-ink">{lesson.title}</h3>
          {unitTitle ? (
            <p className="mt-0.5 line-clamp-1 font-body text-[11px] font-bold uppercase tracking-[0.04em] text-steel">{unitTitle}</p>
          ) : null}
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 line-clamp-2 min-h-[32px] font-body text-[13px] font-medium leading-[1.4] text-steel">{lesson.description ?? "Practice • Build • Learn"}</p>

      {/* Progress bar for Continue / Completed */}
      {isContinue ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-[11px] font-bold text-electric-cyan">{draft.idx + 1} / {draft.total || "?"} exercises</span>
            <span className="font-body text-[11px] font-black text-electric-cyan">{draftProgress}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-dim-steel/20">
            <div className="h-full rounded-full bg-electric-cyan transition-all" style={{ width: `${draftProgress}%` }} />
          </div>
          <p className="mt-1 flex items-center gap-1 font-body text-[11px] font-medium text-steel">
            <Clock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            Resume where you left
          </p>
        </div>
      ) : isCompleted ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-dim-steel/20">
            <div className="h-full w-full rounded-full bg-nex-blue" />
          </div>
          <p className="mt-1 font-body text-[11px] font-bold text-nex-blue">100% · Completed</p>
        </div>
      ) : isLocked ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-[10px] border-2 border-dim-steel/30 bg-dim-steel/10 px-2.5 py-1.5">
          <Lock className="h-3.5 w-3.5 text-steel" strokeWidth={2} aria-hidden="true" />
          <span className="font-body text-[11px] font-bold leading-none text-steel">Complete previous to unlock</span>
        </div>
      ) : (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-dim-steel/20">
            <div className="h-full w-0 rounded-full bg-nex-blue" />
          </div>
          <p className="mt-1 font-body text-[11px] font-medium text-steel">Not started</p>
        </div>
      )}

      {/* CTA — bottom pinned */}
      <div className="mt-4">{cta}</div>

      {/* Locked overlay click blocker */}
      {isLocked ? <span className="absolute inset-0" aria-hidden="true" /> : null}
    </div>
  );

  if (isLocked) {
    return (
      <div aria-label={`${lesson.title} — locked`} className="h-full">
        {CardInner}
      </div>
    );
  }

  return (
    <Link href={href} aria-label={`${lesson.title} — ${isCompleted ? "completed" : isContinue ? "continue" : "start"}`} className="block h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric-cyan">
      {CardInner}
    </Link>
  );
}
