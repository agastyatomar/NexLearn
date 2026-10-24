import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getXpProgress } from "@/lib/level";
import { BADGE_DEFS, ALL_BADGES } from "@/lib/badges";
import { UserAvatar } from "@/components/app/UserAvatar";
import { Flame, Trophy, Target, BookOpen, Star, Moon, Check, Lock, Pencil } from "lucide-react";

const BADGE_ICONS = {
  first_lesson: Target,
  five_lessons: BookOpen,
  perfect: Star,
  streak_3: Flame,
  streak_7: Trophy,
  night_owl: Moon,
};

function StreakCalendar({ streak }) {
  const count = streak?.count ?? 0;
  const now = new Date();
  // Anchor fills to lastActiveDate so "today" ticks when active today,
  // not the oldest day in the 7-day window.
  const toDayStr = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const lastActive = streak?.lastActiveDate ? new Date(streak.lastActiveDate) : null;
  const activeToday = lastActive ? toDayStr(lastActive) === toDayStr(now) : count > 0;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const activeYesterday = lastActive ? toDayStr(lastActive) === toDayStr(yesterday) : false;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const isToday = i === 0;
    let filled = false;
    if (count > 0 && activeToday) {
      filled = i < count;
    } else if (count > 0 && activeYesterday) {
      filled = i >= 1 && i <= count;
    }
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    days.push({ date: d, label, isToday, filled });
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
      {days.map((day, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1.5 sm:gap-2">
          <span
            className={`flex h-[38px] w-[38px] items-center justify-center rounded-full border-[2.5px] text-[15px] font-black leading-none shadow-sm transition-colors sm:h-[56px] sm:w-[56px] sm:text-[16px] ${
              day.filled
                ? "border-nex-blue bg-nex-blue text-snow shadow-[0_3px_0_var(--color-nex-blue-deep)]"
                : day.isToday
                  ? "border-graphite bg-night text-ink shadow-[0_3px_0_rgba(0,0,0,0.1)]"
                  : "border-dim-steel bg-night text-steel"
            }`}
          >
            {day.filled ? <Check className="h-[16px] w-[16px] sm:h-[24px] sm:w-[24px]" strokeWidth={2.8} aria-hidden="true" /> : <span className="font-body text-[13px] font-black sm:text-[15px]">{day.label.slice(0, 1)}</span>}
          </span>
          <span className={`font-body text-[12px] font-bold leading-none sm:text-[13px] ${day.isToday ? "text-ink" : "text-steel"}`}>{day.label}</span>
          <span className="hidden font-body text-[11px] font-medium leading-none text-steel sm:block sm:text-[12px]">
            {day.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const xpInfo = getXpProgress(user?.xp ?? 0);
  const badges = user?.badges ?? [];

  return (
    <div className="mx-auto w-full max-w-[1100px] flex flex-col gap-6">
      <div className="rounded-[16px] border-2 border-dim-steel bg-night p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <UserAvatar src={user?.avatar} name={user?.name} username={user?.username} boxClass="h-20 w-20 rounded-[16px] text-[28px]" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-body text-[24px] font-black leading-[1.1] text-ink">{user?.name ?? user?.username}</h1>
            <p className="font-body text-[14px] font-medium leading-[1.2] text-steel">@{user?.username} · {user?.email}</p>
            {user?.bio ? (
              <p className="mx-auto mt-1.5 max-w-[480px] font-body text-[14px] font-medium leading-[1.4] text-ink sm:mx-0">
                {user.bio}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Link
                href={`/u/${user?.username}`}
                className="inline-flex items-center rounded-full border-2 border-dim-steel bg-night px-3 py-1.5 font-body text-[12px] font-bold leading-none text-electric-cyan transition-colors hover:border-electric-cyan"
              >
                View public page
              </Link>
              <Link
                href="/app/settings"
                className="inline-flex items-center gap-1 rounded-full bg-graphite px-3 py-1.5 font-body text-[12px] font-bold leading-none text-snow"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                Edit profile
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff4e6] px-3 py-1.5 font-body text-[12px] font-black leading-none text-[#b91c1c]">
                <Flame className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                {user?.streak?.count ?? 0} day streak
              </span>
              <span className="rounded-full bg-soft-violet px-3 py-1.5 font-body text-[12px] font-black leading-none text-ink">{user?.xp ?? 0} XP</span>
              <span className="rounded-full bg-electric-cyan px-3 py-1.5 font-body text-[12px] font-black leading-none text-snow">Lv {xpInfo.level}</span>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="font-body text-[13px] font-bold uppercase tracking-[0.04em] text-steel">Level {xpInfo.level} → {xpInfo.nextLevel}</p>
            <p className="font-body text-[13px] font-bold text-steel">
              {xpInfo.have} / {xpInfo.need} XP
            </p>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-dim-steel/20">
            <div className="h-full rounded-full bg-nex-blue transition-all duration-500" style={{ width: `${Math.round(xpInfo.progress * 100)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border-2 border-dim-steel bg-night p-5 sm:p-6">
          <h2 className="font-body text-[16px] font-black leading-[1.2] text-ink">Streak</h2>
          <p className="mt-1 font-body text-[13px] font-medium leading-[1.4] text-steel">Study daily to keep the flame alive. Timezone {user?.timezone ?? "Asia/Kolkata"}.</p>
          <div className="mt-5">
            <StreakCalendar streak={user?.streak} />
          </div>
          <p className="mt-4 text-center font-body text-[13px] font-bold leading-[1.4] text-steel">
            {user?.streak?.count ? `You're on a ${user.streak.count}-day streak — keep it up!` : "Start a lesson today to begin your streak."}
          </p>
        </div>

        <div className="rounded-[16px] border-2 border-dim-steel bg-night p-5 sm:p-6">
          <h2 className="font-body text-[16px] font-black leading-[1.2] text-ink">Stats</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-[12px] border-2 border-dim-steel bg-night p-3 text-center sm:p-4">
              <p className="font-body text-[11px] font-bold uppercase tracking-[0.04em] text-steel">XP</p>
              <p className="mt-1 font-body text-[20px] font-black leading-none text-nex-blue sm:text-[22px]">{user?.xp ?? 0}</p>
            </div>
            <div className="rounded-[12px] border-2 border-dim-steel bg-night p-3 text-center sm:p-4">
              <p className="font-body text-[11px] font-bold uppercase tracking-[0.04em] text-steel">Level</p>
              <p className="mt-1 font-body text-[20px] font-black leading-none text-electric-cyan sm:text-[22px]">{xpInfo.level}</p>
            </div>
            <div className="rounded-[12px] border-2 border-dim-steel bg-night p-3 text-center sm:p-4">
              <p className="font-body text-[11px] font-bold uppercase tracking-[0.04em] text-steel">Badges</p>
              <p className="mt-1 font-body text-[20px] font-black leading-none text-ink sm:text-[22px]">{badges.length}/6</p>
            </div>
          </div>
          <p className="mt-3 text-center font-body text-[12px] font-medium text-steel">Badges unlock automatically as you learn.</p>
        </div>
      </div>

      <div className="rounded-[16px] border-2 border-dim-steel bg-night p-5 sm:p-6">
        <h2 className="font-body text-[16px] font-black leading-[1.2] text-ink">Badges</h2>
        <p className="mt-1 font-body text-[13px] font-medium leading-[1.4] text-steel">Collect them all — Duolingo-style stickers.</p>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_BADGES.map((id) => {
            const def = BADGE_DEFS[id];
            const unlocked = badges.includes(id);
            const Icon = BADGE_ICONS[id];
            return (
              <div
                key={id}
                className={
                  unlocked
                    ? `rounded-[12px] border-2 ${def.border} ${def.bg} p-4 text-center sm:p-5`
                    : "rounded-[12px] border-2 border-dim-steel bg-dim-steel/10 p-4 text-center opacity-60 grayscale sm:p-5"
                }
              >
                <div className={`mx-auto flex h-[64px] w-[64px] items-center justify-center rounded-full border-[2.5px] shadow-sm sm:h-[72px] sm:w-[72px] ${unlocked ? def.border : "border-dim-steel"} ${unlocked ? def.bg : "bg-night"} ${def.iconColor}`}>
                  <Icon className="h-[28px] w-[28px] sm:h-[32px] sm:w-[32px]" strokeWidth={2} aria-hidden="true" />
                </div>
                <p className="mt-3 font-body text-[13px] font-black leading-[1.2] text-ink sm:text-[14px]">{def.title}</p>
                <p className="mt-1 font-body text-[11px] font-medium leading-[1.3] text-steel sm:text-[12px]">{def.desc}</p>
                <p className={`mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-body text-[11px] font-bold uppercase tracking-[0.04em] ${unlocked ? "bg-nex-blue text-snow shadow-[0_2px_0_var(--color-nex-blue-deep)]" : "bg-dim-steel/20 text-steel"}`}>
                  {unlocked ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" /> : <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
                  {unlocked ? "Unlocked" : "Locked"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
