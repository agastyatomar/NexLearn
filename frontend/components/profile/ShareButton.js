/* Copy-link share button for public profiles. No emoji — lucide only. */
"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-[12px] border-2 border-dim-steel bg-night px-4 py-2 font-body text-[13px] font-bold leading-none text-ink transition-colors hover:border-graphite"
    >
      {copied ? (
        <Check className="h-4 w-4 text-nex-blue" strokeWidth={2.6} aria-hidden="true" />
      ) : (
        <Link2 className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
      )}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
