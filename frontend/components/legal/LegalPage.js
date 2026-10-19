import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, Scale } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

/* Shared layout for legal pages (/terms, /policy).
   Matches the existing legal pages and design.md: paper-white canvas,
   charcoal headings, steel body, 2px borders, 12px radius, flat
   fills, nex-blue accents, electric-cyan links, lucide icons only. */

export function LegalSection({ id, icon: Icon, heading, paragraphs = [], bullets = [] }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[12px] border-2 border-dim-steel bg-night p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-soft-violet text-nex-blue-deep">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h2 className="font-body text-[19px] leading-[1.4] font-bold text-ink">{heading}</h2>
      </div>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="mt-3 font-body text-[15px] leading-[1.6] font-medium text-steel"
        >
          {p}
        </p>
      ))}
      {bullets.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex gap-2.5 font-body text-[15px] leading-[1.6] font-medium text-steel"
            >
              <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-nex-blue" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function LegalPage({
  eyebrow = "Legal",
  title,
  intro,
  updated = "September 2026",
  sections = [],
  related = null,
  cta = null,
}) {
  return (
    <div className="flex min-h-screen flex-col bg-night font-body text-ink">
      <Navbar />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-body text-[13px] leading-[1.23] font-bold text-electric-cyan hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to home
        </Link>

        <p className="mt-6 inline-flex items-center gap-1.5 rounded-[12px] border-2 border-dim-steel px-3 py-1.5 font-body text-[12px] leading-[1.23] font-bold tracking-[0.053em] text-steel uppercase">
          <Scale className="size-3.5" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-3 font-feather text-[32px] leading-[1.1] font-black tracking-[-0.02em] text-ink sm:text-[40px]">
          {title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-[14px] leading-[1.4] font-medium text-steel">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden="true" />
            Last updated: {updated}
          </span>
          {related ? (
            <Link href={related.href} className="font-bold text-electric-cyan hover:underline">
              {related.label}
            </Link>
          ) : null}
        </div>
        <p className="mt-4 max-w-[640px] font-body text-[17px] leading-[1.5] font-medium text-steel">
          {intro}
        </p>

        <nav aria-label="On this page" className="mt-8">
          <p className="font-body text-[12px] leading-[1.23] font-bold tracking-[0.053em] text-steel uppercase">
            On this page
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 rounded-[12px] border-2 border-dim-steel px-3.5 py-2.5 font-body text-[14px] leading-[1.4] font-bold text-ink transition-colors duration-[var(--duration-fast)] ease-[var(--ease-smooth-out)] hover:border-electric-cyan hover:text-electric-cyan"
                >
                  <s.icon className="size-4 shrink-0" aria-hidden="true" />
                  {s.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8 flex flex-col gap-4 sm:gap-5">
          {sections.map((s) => (
            <LegalSection
              key={s.id}
              id={s.id}
              icon={s.icon}
              heading={s.heading}
              paragraphs={s.paragraphs}
              bullets={s.bullets}
            />
          ))}
        </div>

        {cta ? (
          <div className="mt-8 rounded-[12px] border-2 border-nex-blue bg-soft-violet/40 p-6 sm:p-8">
            <h2 className="font-body text-[19px] leading-[1.4] font-bold text-ink">
              {cta.heading}
            </h2>
            <p className="mt-2 font-body text-[15px] leading-[1.6] font-medium text-steel">
              {cta.text}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="primary" size="default" href={cta.buttonHref}>
                {cta.buttonLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              {cta.secondaryHref ? (
                <Link
                  href={cta.secondaryHref}
                  className="font-body text-[14px] leading-[1.4] font-bold text-electric-cyan hover:underline"
                >
                  {cta.secondaryLabel}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
