/* Shared user stats — desktop sidebar card + mobile top-bar pills.
   Project rule: NO emoji in app UI. Streak / XP / level always use
   lucide-react icons (Flame, Zap, Trophy). See DESIGN.md Don'ts.
   Pure presentational — safe in server and client components. */

import { Flame, Zap, Trophy } from "lucide-react";

export function SidebarStats({ streakCount = 0, xp = 0, level = 1, xpInfo = null }) {
  const progress = xpInfo ? Math.round(Math.min(1, Math.max(0, xpInfo.progress)) * 100) : 0;

  return (
    <div className="rounded-[16px] border-2 border-dim-steel bg-night p-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col items-center gap-1.5 rounded-[12px] bg-[#fff4e6] px-1 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#ff9600] text-night">
            <Flame className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="font-body text-[16px] font-black leading-none text-ink">{streakCount}</span>
          <span className="font-body text-[10px] font-bold uppercase leading-none tracking-[0.05em] text-steel">Streak</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-[12px] bg-soft-violet px-1 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-nex-blue text-snow">
            <Zap className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="font-body text-[16px] font-black leading-none text-ink">{xp}</span>
          <span className="font-body text-[10px] font-bold uppercase leading-none tracking-[0.05em] text-steel">XP</span>
        </div>
        <div className="flex flex-col items-center gap-1.5 rounded-[12px] bg-[#e6f4ff] px-1 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-electric-cyan text-night">
            <Trophy className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          </span>
          <span className="font-body text-[16px] font-black leading-none text-ink">{level}</span>
          <span className="font-body text-[10px] font-bold uppercase leading-none tracking-[0.05em] text-steel">Level</span>
        </div>
      </div>

      {xpInfo ? (
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <p className="font-body text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-steel">
              Lv {xpInfo.level} → {xpInfo.nextLevel}
            </p>
            <p className="font-body text-[11px] font-bold leading-none text-steel">
              {xpInfo.have}/{xpInfo.need} XP
            </p>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-dim-steel/20">
            <div className="h-full rounded-full bg-nex-blue transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TopbarStats({ streakCount = 0, xp = 0, level = 1 }) {
  return (
    <div className="flex items-center gap-1.5">
      <span title={`${streakCount} day streak`} className="inline-flex items-center gap-1 rounded-full border-2 border-[#ffd8a8] bg-[#fff4e6] px-2 py-1 font-body text-[12px] font-black leading-none text-[#e8590c]">
        <Flame className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        {streakCount}
      </span>
      <span title={`${xp} XP`} className="inline-flex items-center gap-1 rounded-full border-2 border-[#b5e39a] bg-soft-violet px-2 py-1 font-body text-[12px] font-black leading-none text-[#2b8a00]">
        <Zap className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        {xp}
      </span>
      <span title={`Lv ${level}`} className="inline-flex items-center gap-1 rounded-full border-2 border-[#74c0fc] bg-electric-cyan px-2 py-1 font-body text-[12px] font-black leading-none text-night">
        <Trophy className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
        {level}
      </span>
    </div>
  );
}
