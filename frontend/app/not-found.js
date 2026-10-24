import Link from "next/link";
import { Compass, ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandLogo";

/* Global 404 — friendly, on-brand night canvas with working exits. */

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="aurora-backdrop flex min-h-dvh flex-col items-center justify-center bg-night px-4 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-soft-violet p-2">
        <BrandMark size={36} />
      </span>
      <p className="mt-5 font-body text-[12px] font-black uppercase tracking-[0.08em] text-steel">
        404 — unexplored territory
      </p>
      <h1 className="mt-1 font-feather text-[30px] leading-[1.15] font-black tracking-[-0.02em] text-ink sm:text-[38px]">
        This page wandered off the path
      </h1>
      <p className="mt-3 max-w-[380px] font-body text-[15px] leading-[1.5] font-medium text-steel">
        Nothing lives here yet. Treat it like a locked lesson: turn back,
        find the right door, keep the streak alive.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="nex-btn nex-btn-primary inline-flex items-center gap-2 rounded-[12px] border-2 border-nex-blue bg-nex-blue px-5 py-2.5 font-body text-[14px] font-bold text-nex-blue/10 transition-colors"
          style={{ color: "#f8f7ff" }}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          Back home
        </Link>
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-[12px] border-2 border-dim-steel bg-night px-5 py-2.5 font-body text-[14px] font-bold text-ink transition-colors hover:border-graphite"
        >
          <Compass className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Read the docs
        </Link>
      </div>
    </main>
  );
}
