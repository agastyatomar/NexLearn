/* TEMPORARY placeholder illustration for the hero.
   TODO: swap with the final NexLearn mascot/hero artwork.
   Original flat SVG (no third-party or Duolingo assets): a rounded
   code window with sticker-style 2px outlines. Secondary-palette
   shapes (orange/purple/pink/blue) live ONLY inside this artwork,
   never in UI chrome, per design.md. */

export function HeroIllustration({ className }) {
  return (
    <svg
      viewBox="0 0 480 400"
      role="img"
      aria-label="Illustration of a code editor with playful shapes"
      className={className}
    >
      {/* floating backdrop shapes */}
      <circle cx="70" cy="70" r="34" fill="#ff9600" />
      <circle cx="414" cy="92" r="22" fill="#ce82ff" />
      <rect x="392" y="300" width="52" height="52" rx="12" fill="#ff86d0" />
      <path d="M52 300l22-38 22 38z" fill="#22d3ee" />

      {/* code window */}
      <rect
        x="96"
        y="80"
        width="288"
        height="240"
        rx="12"
        fill="#101735"
        stroke="#2b3757"
        strokeWidth="2"
      />
      <line x1="96" y1="124" x2="384" y2="124" stroke="#2b3757" strokeWidth="2" />
      <circle cx="120" cy="102" r="7" fill="#4f7cff" />
      <circle cx="142" cy="102" r="7" fill="#22d3ee" />
      <circle cx="164" cy="102" r="7" fill="#5f6d94" />

      {/* code lines */}
      <rect x="120" y="148" width="120" height="14" rx="7" fill="#4f7cff" />
      <rect x="120" y="174" width="200" height="14" rx="7" fill="#5f6d94" />
      <rect x="120" y="200" width="160" height="14" rx="7" fill="#22d3ee" />
      <rect x="140" y="226" width="180" height="14" rx="7" fill="#93a0c4" />
      <rect x="140" y="252" width="96" height="14" rx="7" fill="#8b5cf6" />
      <rect x="120" y="278" width="140" height="14" rx="7" fill="#ddd6fe" />

      {/* play badge */}
      <circle cx="352" cy="296" r="40" fill="#4f7cff" stroke="#312e81" strokeWidth="2" />
      <path d="M342 274l32 22-32 22z" fill="#ffffff" />
    </svg>
  );
}
