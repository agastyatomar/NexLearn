import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Heart,
  Rocket,
  Target,
  MapPin,
  Sparkles,
} from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

/* About — the friendly face of the project: who made it, why, and who
   it's dedicated to. No auth, no client fetch. Fully render-time.
   Design language matches /docs: night canvas, feather display type,
   12px radius cards with 2px borders. */

export const metadata = {
  title: "About",
  description:
    "The story behind NexLearn — why it exists, who it's made for, and the one who built it. A free, community-first way to learn code.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About | ${SITE_NAME}`,
    description:
      "The story behind NexLearn — why it exists, who it's made for, and the one who built it.",
    url: `${siteUrl()}/about`,
    siteName: SITE_NAME,
    type: "article",
  },
};

const STACK = [
  { label: "Next.js 16 App Router", note: "The app you scroll through" },
  { label: "Cloudflare Workers", note: "One orange box runs everything" },
  { label: "Cloudflare D1", note: "All users, content and progress" },
  { label: "Hono API + cron", note: "Auth, streaks, community, AI helper" },
];

const VALUES = [
  {
    icon: Target,
    title: "Built for first-timers",
    body: "Lessons start from absolute zero — no jargon walls, no sign-up teasers, no paid tiers. If you can read English or school-level Hindi, you can start today.",
  },
  {
    icon: Sparkles,
    title: "Practice beats watching",
    body: "MCQs, blanks, output prediction, bug fixes, real code — every concept ends in your fingers, not just in your notes.",
  },
  {
    icon: Rocket,
    title: "Streaks > motivation",
    body: "XP, levels, hearts, freezes, badges and daily goals turn showing up into a habit. Streaks are the friend that drags you back to practice.",
  },
  {
    icon: Heart,
    title: "Community, not comments",
    body: "Doubt threads per lesson, upvotes, accepted answers, live feeds, report tools — plus a friendly AI helper when nobody is around.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-night font-body text-ink">
      {/* Top bar */}
      <header className="border-b-2 border-dim-steel bg-night">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            aria-label="NexLearn home"
            className="inline-flex items-center gap-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-soft-violet p-1">
              <BrandMark size={24} />
            </span>
            <span className="font-feather text-[22px] leading-none font-black tracking-[-0.02em]">
              NexLearn
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-dim-steel bg-snow px-3 py-1.5 font-body text-[13px] font-bold leading-none text-ink transition-all hover:bg-soft-violet"
          >
            <ArrowLeft className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6 md:py-14">
        <p className="font-body text-[12px] font-black uppercase tracking-[0.08em] text-steel">
          About the project
        </p>
        <h1 className="mt-2 font-feather text-[34px] leading-[1.05] font-black tracking-[-0.02em] sm:text-[44px]">
          NexLearn, in one page
        </h1>
        <p className="mt-4 max-w-[640px] font-body text-[16px] leading-[1.55] text-steel">
          {SITE_TAGLINE}. NexLearn exists because good coding education is
          expensive, English-heavy, and boring. This is an attempt to make it
          free, friendly, and a tiny bit fun.
        </p>

        {/* Made by card */}
        <div className="mt-8 overflow-hidden rounded-[14px] border-2 border-dim-steel bg-snow">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border-2 border-dim-steel bg-soft-violet font-feather text-[24px] font-black text-ink">
                AT
              </span>
              <div>
                <p className="font-body text-[12px] font-black uppercase tracking-[0.08em] text-steel">
                  Made with care by
                </p>
                <p className="font-feather text-[24px] leading-tight font-black tracking-[-0.02em]">
                  Agastya Tomar
                </p>
                <a
                  href="https://github.com/agastyatomar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 inline-flex items-center gap-1 font-body text-[14px] font-bold leading-none text-electric-cyan underline-offset-2 hover:underline"
                >
                  github.com/agastyatomar
                  <ArrowUpRight className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="rounded-[12px] border-2 border-dim-steel bg-night px-4 py-3 font-body text-[13px] leading-[1.45] text-steel sm:max-w-[260px]">
              Design, code, content, seed database, and the occasional
              deployment battle — one person, too many cups of chai.
            </div>
          </div>
        </div>

        {/* Dedication */}
        <div className="mt-6 rounded-[14px] border-2 border-electric-cyan/40 bg-[#e6f4ff] p-6 sm:p-8">
          <p className="font-feather text-[20px] leading-[1.3] font-black tracking-[-0.01em] text-ink sm:text-[24px]">
            Dedicated to every learner chasing their first &ldquo;Hello,
            World&rdquo; —
          </p>
          <p className="mt-2 max-w-[620px] font-body text-[15px] leading-[1.55] text-steel">
            to the students in tier-3 classrooms on borrowed phones, to the
            2 AM debuggers, to everyone who was told &ldquo;this isn&apos;t
            for you&rdquo; and is reading this sentence anyway. Keep going —
            the internet is proof enough that persistence wins.
          </p>
        </div>

        {/* What we believe */}
        <h2 className="mt-12 font-feather text-[26px] font-black tracking-[-0.02em]">
          What we believe
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-[12px] border-2 border-dim-steel bg-night p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-soft-violet">
                <Icon className="size-4.5 text-ink" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <p className="mt-3 font-body text-[15px] leading-none font-black">{title}</p>
              <p className="mt-2 font-body text-[13.5px] leading-[1.5] text-steel">{body}</p>
            </div>
          ))}
        </div>

        {/* Stack */}
        <h2 className="mt-12 font-feather text-[26px] font-black tracking-[-0.02em]">
          Under the hood
        </h2>
        <p className="mt-2 max-w-[640px] font-body text-[15px] leading-[1.5] text-steel">
          One Cloudflare Worker houses the Next.js app and the{" "}
          <code className="rounded bg-soft-violet px-1.5 py-0.5 font-mono text-[12.5px] font-bold text-ink">/api</code>{" "}
          — same origin, first-party cookies, no cold-start drama.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {STACK.map(({ label, note }) => (
            <li key={label} className="flex items-center justify-between gap-3 rounded-[10px] border-2 border-dim-steel bg-night px-4 py-3">
              <span className="font-mono text-[13px] font-bold">{label}</span>
              <span className="text-right font-body text-[12px] leading-[1.3] text-steel">{note}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex items-center gap-1.5 font-body text-[12.5px] text-steel">
          <MapPin className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          Deployed on Cloudflare&apos;s free tier — every visitor stays anonymous until they choose otherwise.
        </p>

        {/* CTA */}
        <div className="mt-12 rounded-[14px] border-2 border-dim-steel bg-graphite p-6 sm:p-8">
          <p className="font-feather text-[24px] leading-[1.15] font-black tracking-[-0.02em] text-snow">
            Tired of reading about it?
          </p>
          <p className="mt-1.5 font-body text-[14px] text-snow/70">
            Unit 1, Lesson 1 takes about 2 minutes. XP guaranteed.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-electric-cyan px-4 py-2.5 font-body text-[14px] font-black text-ink transition hover:brightness-110"
            >
              Start free
              <ArrowUpRight className="size-4" strokeWidth={2.6} aria-hidden="true" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-snow/30 px-4 py-2.5 font-body text-[14px] font-bold text-snow transition hover:bg-snow/10"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </main>

      {/* Thin footer */}
      <footer className="border-t-2 border-dim-steel">
        <div className="mx-auto flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="font-body text-[13px] text-steel">
            © {new Date().getFullYear()} NexLearn — made by{" "}
            <span className="font-bold text-ink">agastyatomar</span>
          </p>
          <div className="flex items-center gap-4 font-body text-[13px] font-bold">
            <Link href="/docs" className="text-steel hover:text-ink">Docs</Link>
            <Link href="/policy" className="text-steel hover:text-ink">Policy</Link>
            <Link href="/terms" className="text-steel hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
