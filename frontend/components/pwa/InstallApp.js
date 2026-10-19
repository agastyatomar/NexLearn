"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, Share } from "lucide-react";

/* Install CTA card for Settings. Captures the browser's install prompt and
   fires it from our own button; shows installed state via display-mode;
   falls back to platform instructions (iOS Safari has no install prompt —
   it needs Share → Add to Home Screen). No emoji — lucide icons only. */

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window).MSStream;
}

export function InstallApp() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ios] = useState(isIos);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(mq.matches || window.navigator.standalone === true);
    sync();
    mq.addEventListener?.("change", sync);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      mq.removeEventListener?.("change", sync);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferred || busy) return;
    setBusy(true);
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* dismissed or failed — prompt stays available */
    } finally {
      setDeferred(null);
      setBusy(false);
    }
  }, [deferred, busy]);

  return (
    <div className="rounded-[16px] border-2 border-dim-steel bg-night p-5">
      <div className="flex items-center gap-3">
        <span
          className={
            installed
              ? "flex h-10 w-10 items-center justify-center rounded-[12px] bg-soft-violet text-nex-blue"
              : "flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#e6f4ff] text-electric-cyan"
          }
          aria-hidden="true"
        >
          {installed ? (
            <Check className="h-5 w-5" strokeWidth={2.6} />
          ) : (
            <Download className="h-5 w-5" strokeWidth={2.2} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-body text-[15px] font-bold leading-[1.3] text-ink">Install the app</h2>
          <p className="font-body text-[13px] font-medium leading-[1.4] text-steel">
            {installed
              ? "Installed — launch NexLearn from your home screen, works offline."
              : "Add NexLearn to your home screen for one-tap lessons and offline mode."}
          </p>
        </div>
      </div>

      {!installed && deferred ? (
        <button
          type="button"
          onClick={handleInstall}
          disabled={busy}
          className="nex-btn nex-btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[12px] border-2 border-nex-blue bg-nex-blue px-5 py-3 font-body text-[14px] font-bold uppercase leading-none tracking-[0.053em] text-snow hover:brightness-95 disabled:opacity-60 sm:w-auto"
        >
          <Download className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          {busy ? "Installing…" : "Install app"}
        </button>
      ) : null}

      {!installed && !deferred ? (
        <p className="mt-3 inline-flex items-start gap-1.5 rounded-[12px] bg-dim-steel/15 px-3 py-2 font-body text-[13px] font-medium leading-[1.4] text-steel">
          <Share className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
          {ios
            ? "On iPhone: tap Share, then “Add to Home Screen”."
            : "Open your browser menu and tap “Install app” or “Add to Home Screen”."}
        </p>
      ) : null}
    </div>
  );
}
