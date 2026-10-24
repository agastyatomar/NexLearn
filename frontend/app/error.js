"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";

/* Global error boundary — catches unexpected render errors and
   offers a retry without losing the user's place in the app. */

export default function GlobalRouteError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-4 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#ffe6e6] text-nex-blue">
        <RefreshCw
          className="h-6 w-6"
          strokeWidth={2.2}
          aria-hidden="true"
          style={{ color: "#b91c1c" }}
        />
      </span>
      <h1 className="mt-5 font-feather text-[26px] leading-[1.2] font-black tracking-[-0.02em] text-ink sm:text-[32px]">
        Something glitched on the way here
      </h1>
      <p className="mt-3 max-w-[360px] font-body text-[14.5px] leading-[1.5] font-medium text-steel">
        A quick retry usually fixes it. Your XP, streak and progress are
        already saved.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="nex-btn nex-btn-primary inline-flex items-center gap-2 rounded-[12px] border-2 border-nex-blue bg-nex-blue px-5 py-2.5 font-body text-[14px] font-bold transition-colors"
          style={{ color: "#f8f7ff" }}
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          Try again
        </button>
        <a
          href="/app"
          className="inline-flex items-center gap-2 rounded-[12px] border-2 border-dim-steel bg-night px-5 py-2.5 font-body text-[14px] font-bold text-ink transition-colors hover:border-graphite"
        >
          <Home className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Go to dashboard
        </a>
      </div>
    </main>
  );
}
