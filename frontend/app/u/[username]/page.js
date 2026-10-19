import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpenCheck, CalendarDays, EyeOff, Flame, Pencil } from "lucide-react";
import { API_BASE, fetchPublicProfile } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getXpProgress } from "@/lib/level";
import { BADGE_DEFS, ALL_BADGES } from "@/lib/badges";
import { UserAvatar } from "@/components/app/UserAvatar";
import { ShareButton } from "@/components/profile/ShareButton";

async function getProfile(username) {
  const { res, data } = await fetchPublicProfile(username);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load profile");
  return data?.user ?? null;
}

export async function generateMetadata({ params }) {
  const { username } = await params;
  const { res, data } = await fetchPublicProfile(username);
  const profile = res.ok ? data?.user : null;
  // Private profiles (and missing ones) stay out of the index; the page
  // itself still renders (or 404s) for visitors.
  if (!profile || profile.isPrivate) {
    return {
      title: { absolute: `@${username} — NexLearn` },
      robots: { index: false, follow: false },
    };
  }
  const name = profile.name ?? profile.username;
  const xp = profile.xp ?? 0;
  const level = profile.level ?? 1;
  return {
    title: { absolute: `@${username} — NexLearn` },
    description: `${name} is learning to code on NexLearn — ${xp} XP, level ${level}. Join free and start your own streak.`,
    alternates: { canonical: `/u/${username}` },
    openGraph: {
      title: `@${username} on NexLearn`,
      description: `${name} — ${xp} XP, level ${level}. Learn to code free, fun, together.`,
      type: "profile",
      username: profile.username,
    },
    twitter: {
      card: "summary",
      title: `@${username} on NexLearn`,
      description: `${name} — ${xp} XP, level ${level}. Learn to code free, fun, together.`,
    },
  };
}

export default async function PublicProfilePage({ params }) {
  const { username } = await params;
  const [profile, viewer] = await Promise.all([getProfile(username), getCurrentUser()]);
  if (!profile) notFound();
  const isOwn = viewer?.username?.toLowerCase() === profile.username?.toLowerCase();
  const isPrivate = Boolean(profile.isPrivate);

  return (
    <div className="min-h-screen bg-night font-body text-ink">
      {/* Minimal public header */}
      <header className="border-b-2 border-dim-steel bg-night">
        <div className="mx-auto flex h-[60px] w-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="font-feather text-[22px] font-black tracking-[-0.02em] text-nex-blue">
            NexLearn
          </Link>
          {viewer ? (
            <Link
              href="/app"
              className="nex-btn nex-btn-primary rounded-[12px] border-2 border-nex-blue bg-nex-blue px-4 py-2 font-body text-[13px] font-bold uppercase leading-none tracking-[0.053em] text-snow hover:brightness-95"
            >
              Open app
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-[12px] px-3 py-2 font-body text-[13px] font-bold uppercase leading-none tracking-[0.053em] text-steel hover:text-ink"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="nex-btn nex-btn-primary rounded-[12px] border-2 border-nex-blue bg-nex-blue px-4 py-2 font-body text-[13px] font-bold uppercase leading-none tracking-[0.053em] text-snow hover:brightness-95"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-4 py-8 sm:px-6">
        {/* Identity card */}
        <div className="overflow-hidden rounded-[20px] border-2 border-dim-steel bg-night">
          <div className="h-[72px] bg-soft-violet" aria-hidden="true" />
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <div className="-mt-10 flex items-end justify-between gap-3">
              <UserAvatar
                src={profile.avatar}
                name={profile.name}
                username={profile.username}
                boxClass="h-20 w-20 rounded-[20px] text-[30px]"
              />
              <div className="flex gap-2 pb-1">
                <ShareButton />
                {isOwn ? (
                  <Link
                    href="/app/settings"
                    className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-graphite bg-graphite px-4 py-2 font-body text-[13px] font-bold leading-none text-snow"
                  >
                    <Pencil className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                    Edit
                  </Link>
                ) : null}
              </div>
            </div>
            <h1 className="mt-3 font-body text-[24px] font-bold leading-[1.15] text-ink">
              {profile.name ?? profile.username}
            </h1>
            <p className="font-body text-[14px] font-medium leading-[1.3] text-steel">@{profile.username}</p>
            {!isPrivate && profile.bio ? (
              <p className="mt-2 max-w-[560px] font-body text-[15px] font-medium leading-[1.45] text-ink">
                {profile.bio}
              </p>
            ) : null}
            <p className="mt-2 inline-flex items-center gap-1.5 font-body text-[12px] font-bold text-steel">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
              {isPrivate ? "Member" : `Learning since ${new Date(profile.memberSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`}
            </p>
          </div>
        </div>

        {isPrivate && !isOwn ? (
          <div className="mt-4 rounded-[16px] border-2 border-dashed border-dim-steel bg-night p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-dim-steel/20 text-steel">
              <EyeOff className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
            </div>
            <h2 className="mt-3 font-body text-[17px] font-bold text-ink">This profile is private</h2>
            <p className="mx-auto mt-1 max-w-[360px] font-body text-[14px] font-medium leading-[1.45] text-steel">
              @{profile.username} keeps their stats hidden — only the name shows here.
            </p>
          </div>
        ) : isPrivate && isOwn ? (
          <div className="mt-4 rounded-[16px] border-2 border-dim-steel bg-night p-5 text-center">
            <p className="inline-flex items-center gap-1.5 font-body text-[13px] font-bold text-steel">
              <EyeOff className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Only you see this — your profile is private. Turn it off in Settings to show your showcase.
            </p>
          </div>
        ) : (
          <Showcase profile={profile} />
        )}

        {!viewer ? (
          <div className="mt-6 rounded-[16px] border-2 border-nex-blue bg-soft-violet p-5 text-center sm:p-6">
            <h2 className="font-body text-[17px] font-bold text-ink">Learn to code free, like @{profile.username}</h2>
            <p className="mx-auto mt-1 max-w-[420px] font-body text-[14px] font-medium text-ink">
              Bite-sized lessons, real code in your browser, and a streak that keeps you going.
            </p>
            <Link
              href="/signup"
              className="nex-btn nex-btn-primary mt-4 inline-flex items-center justify-center rounded-[12px] border-2 border-nex-blue bg-nex-blue px-6 py-3 font-body text-[14px] font-bold uppercase leading-none tracking-[0.053em] text-snow hover:brightness-95"
            >
              Start learning free
            </Link>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Showcase({ profile }) {
  const xpInfo = getXpProgress(profile.xp ?? 0);
  const badges = profile.badges ?? [];
  const stats = [
    { label: "Day streak", value: String(profile.streak?.count ?? 0), icon: Flame, tile: "bg-[#fff4e6] text-[#ff9600]" },
    { label: "Total XP", value: String(profile.xp ?? 0), icon: BookOpenCheck, tile: "bg-soft-violet text-nex-blue" },
    { label: "Level", value: String(profile.level ?? 1), icon: CalendarDays, tile: "bg-[#e6f4ff] text-electric-cyan" },
  ];

  return (
    <>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[16px] border-2 border-dim-steel bg-night p-3 text-center sm:p-4">
            <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-[12px] ${s.tile}`} aria-hidden="true">
              <s.icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <p className="mt-2 font-body text-[20px] font-black leading-none text-ink sm:text-[22px]">{s.value}</p>
            <p className="mt-1 font-body text-[10px] font-bold uppercase leading-none tracking-[0.05em] text-steel sm:text-[11px]">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[16px] border-2 border-dim-steel bg-night p-5">
        <div className="flex items-center justify-between">
          <p className="font-body text-[13px] font-bold uppercase tracking-[0.04em] text-steel">
            Level {xpInfo.level} → {xpInfo.nextLevel}
          </p>
          <p className="font-body text-[13px] font-bold text-steel">
            {profile.completedLessons ?? 0} lessons done
          </p>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-dim-steel/20">
          <div className="h-full rounded-full bg-nex-blue" style={{ width: `${Math.round(xpInfo.progress * 100)}%` }} />
        </div>
      </div>

      <div className="mt-4 rounded-[16px] border-2 border-dim-steel bg-night p-5">
        <h2 className="font-body text-[16px] font-black text-ink">
          Badges <span className="font-bold text-steel">{badges.length}/{ALL_BADGES.length}</span>
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {ALL_BADGES.map((id) => {
            const def = BADGE_DEFS[id];
            const unlocked = badges.includes(id);
            return (
              <div
                key={id}
                title={`${def.title} — ${unlocked ? "unlocked" : "locked"}`}
                className={
                  unlocked
                    ? `rounded-[12px] border-2 ${def.border} ${def.bg} p-2.5 text-center`
                    : "rounded-[12px] border-2 border-dim-steel bg-dim-steel/10 p-2.5 text-center opacity-50 grayscale"
                }
              >
                <p className={`font-body text-[11px] font-black leading-[1.2] ${unlocked ? "text-ink" : "text-steel"}`}>
                  {def.title}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
