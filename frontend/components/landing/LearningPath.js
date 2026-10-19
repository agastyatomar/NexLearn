/* Learning Path section — visual skill path preview showing locked,
   available, and completed lesson nodes. Server component.
   Alternates layout: illustration left, text right. */

import { Button } from "@/components/ui/button";

function PathIllustration() {
  return (
    <svg
      viewBox="0 0 480 400"
      role="img"
      aria-label="Illustration of a learning path with locked and completed lessons"
      className="h-auto w-full max-w-[440px]"
    >
      {/* vertical path line */}
      <line x1="240" y1="40" x2="240" y2="360" stroke="#ddd6fe" strokeWidth="4" strokeLinecap="round" />

      {/* completed node */}
      <circle cx="240" cy="80" r="32" fill="#4f7cff" stroke="#312e81" strokeWidth="2" />
      <path d="M228 80l8 8 16-16" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="290" y="85" fontFamily="sans-serif" fontSize="14" fontWeight="700" fill="#4f7cff">Lesson 1 · Done</text>

      {/* available node */}
      <circle cx="240" cy="180" r="32" fill="#101735" stroke="#22d3ee" strokeWidth="2" />
      <text x="240" y="186" fontFamily="sans-serif" fontSize="24" textAnchor="middle" fill="#22d3ee">▶</text>
      <text x="290" y="185" fontFamily="sans-serif" fontSize="14" fontWeight="700" fill="#22d3ee">Lesson 2</text>

      {/* locked node */}
      <circle cx="240" cy="280" r="32" fill="#151d38" stroke="#5f6d94" strokeWidth="2" />
      <rect x="230" y="268" width="20" height="16" rx="3" fill="#5f6d94" />
      <circle cx="240" cy="274" r="5" fill="#151d38" />
      <text x="290" y="285" fontFamily="sans-serif" fontSize="14" fontWeight="700" fill="#5f6d94">Lesson 3 · Locked</text>

      {/* decorative shapes */}
      <circle cx="80" cy="100" r="16" fill="#ff9600" />
      <circle cx="400" cy="300" r="12" fill="#ce82ff" />
      <rect x="60" y="280" width="32" height="32" rx="8" fill="#ff86d0" />
    </svg>
  );
}

export function LearningPath() {
  return (
    <section className="bg-night">
      <div className="mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28 lg:gap-[64px]">
        {/* Text — first on mobile, right on desktop */}
        <div className="flex max-w-[480px] flex-col items-start gap-6 order-2 md:order-1">
          <h2 className="font-feather text-[32px] leading-[1.2] font-black tracking-[-0.02em] text-nex-blue sm:text-[40px] md:text-[48px]">
            your path, your pace
          </h2>
          <p className="font-body text-body leading-body font-medium text-steel">
            Follow visual skill paths designed to keep you moving — from JS from Zero
            to Code with AI. Each lesson builds on the last, every path runs
            newbie-to-expert, and you never lose your place.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="primary" href="/signup">
              Start learning
            </Button>
          </div>
        </div>

        {/* Illustration — second on mobile, left on desktop */}
        <div className="flex justify-center order-1 md:order-2 md:justify-start">
          <PathIllustration />
        </div>
      </div>
    </section>
  );
}
