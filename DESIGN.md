# NexLearn — Style Reference
> Premium education-tech on deep navy glass

**Theme:** dark (deep navy / near-black surfaces)

Source measurements are normalized; roles and recommendations are interpreted. Font summary lists are independent, not paired by position. HTML examples are reconstructions, not source components.

NexLearn's interface treats the page like a focused night workspace: a deep navy canvas with near-black bands, crisp light typography, and restrained electric accents. A single electric blue owns primary actions and display headings; cyan marks interactive links and focus; violet appears only as a soft accent wash. Body copy stays calm in steel blue-gray so the accents do the emotional work. Components are pill-shaped or chunky-rounded with thick 2px borders, giving every button the feel of a precision key. Buttons add a chunky 4px bottom edge in a darker shade of their fill that compresses when pressed. Subtle glows and glass effects appear only where they improve depth (hero artwork, install banners) — never on dense UI chrome.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Nex Blue | `#4f7cff` | `--color-nex-blue` | Primary CTA fill, display headings, progress/success fills |
| Nex Blue Deep | `#2d54c5` | `--color-nex-blue-deep` | Darker shade of Nex Blue, used ONLY as the 4px bottom press-edge under the primary button |
| Nex Blue Soft | `#93c5fd` | `--color-nex-blue-soft` | Light blue tint for hover washes and soft highlights |
| Electric Cyan | `#22d3ee` | `--color-electric-cyan` | Links, focus rings, secondary interactive accents |
| Pale Cyan | `#67e8f9` | `--color-pale-cyan` | Light cyan wash; ONLY as the 4px bottom press-edge under the outlined button |
| Soft Violet | `#ddd6fe` | `--color-soft-violet` | Soft accent wash on dark surfaces, subtle background tints behind icons |
| Indigo Ink | `#312e81` | `--color-indigo-ink` | Deep violet accent, selection background |
| Night | `#0b1026` | `--color-night` | Page canvas — the deep navy surface everything sits on |
| Abyss | `#070b18` | `--color-abyss` | Near-black band for footer and top-level contrast zones |
| Snow | `#f7f9ff` | `--color-snow` | Inverted text on dark/colored fills, logo wordmark |
| Ink | `#dbe3f5` | `--color-ink` | Hero headings and primary body copy — the workhorse light text |
| Steel | `#93a0c4` | `--color-steel` | Muted body paragraphs, secondary descriptive text — recedes so accents lead |
| Dim Steel | `#5f6d94` | `--color-dim-steel` | Disabled or low-emphasis nav labels and borders |
| Graphite | `#182142` | `--color-graphite` | Elevated card/surface fill one step above the canvas |

## Tokens — Typography

### feather — Display headlines for section titles like 'free. fun. effective.' and 'nexlearn english test' — a custom rounded display face that gives the brand its toy-like, mascot-friendly voice. Substitute with 'Feather Bold' or 'Nunito Black' at matching weight. letter-spacing: -0.0200em · `--font-feather`
- **Weights:** 700
- **Sizes:** 48px, 64px
- **Line height:** 1.20
- **Letter spacing:** -0.0200em
- **Role:** Display headlines for section titles like 'free. fun. effective.' and 'nexlearn english test' — a custom rounded display face that gives the brand its toy-like, mascot-friendly voice. Substitute with 'Feather Bold' or 'Nunito Black' at matching weight. letter-spacing: -0.0200em

### nexlearn-sans — Body paragraphs and nav links at 17px/500 — a geometric sans that stays readable while letting weight 700 carry emphasis. Substitute with 'DIN Next', 'Inter', or 'Nunito Sans' · `--font-body`
- **Weights:** 500
- **Sizes:** 13px, 14px, 15px, 17px, 19px, 32px
- **Line height:** 1.15, 1.18, 1.20, 1.21, 1.23, 1.33, 1.40, 1.41, 1.47
- **Letter spacing:** normal
- **Role:** Body paragraphs and nav links at 17px/500 — a geometric sans that stays readable while letting weight 700 carry emphasis. Substitute with 'DIN Next', 'Inter', or 'Nunito Sans'

### nexlearn-sans — All weight-700 uses: uppercase nav labels at 15px (ls 0.0530em), subheadings at 19px and 32px, link emphasis at 13px. Same family as body — the visual distinction is weight, not face change. letter-spacing: 0.0530em on uppercase nav · `--font-body`
- **Weights:** 700
- **Sizes:** 13px, 14px, 15px, 17px, 19px, 32px
- **Line height:** 1.23, 1.21, 1.33, 1.40, 1.20
- **Letter spacing:** 0.0530em
- **Role:** All weight-700 uses: uppercase nav labels at 15px (ls 0.0530em), subheadings at 19px and 32px, link emphasis at 13px. Same family as body — the visual distinction is weight, not face change. letter-spacing: 0.0530em on uppercase nav

### Type Scale

| Role | Family | Weight | Size | Line Height | Letter Spacing | Token |
|------|--------|--------|------|-------------|----------------|-------|
| caption | — | — | 13px | 1.23 | — | `--text-caption` |
| nav-label | — | — | 15px | 1.33 | 0.795px | `--text-nav-label` |
| body | — | — | 17px | 1.18 | — | `--text-body` |
| subheading | — | — | 19px | 1.4 | — | `--text-subheading` |
| heading-sm | — | — | 32px | 1.2 | — | `--text-heading-sm` |
| heading | — | — | 48px | 1.2 | -0.96px | `--text-heading` |
| display | — | — | 64px | 1.2 | -1.28px | `--text-display` |

## Tokens — Spacing & Shapes

**Base unit:** 4px

**Density:** comfortable

### Spacing Scale

| Name | Value | Token |
|------|-------|-------|
| 8 | 8px | `--spacing-8` |
| 12 | 12px | `--spacing-12` |
| 16 | 16px | `--spacing-16` |
| 24 | 24px | `--spacing-24` |
| 32 | 32px | `--spacing-32` |
| 40 | 40px | `--spacing-40` |
| 48 | 48px | `--spacing-48` |
| 64 | 64px | `--spacing-64` |
| 80 | 80px | `--spacing-80` |
| 96 | 96px | `--spacing-96` |

### Border Radius

| Element | Value |
|---------|-------|
| links | 12px |
| buttons | 12px |
| nav-items | 12px |

### 3D Bottom Edge (buttons only)

| State | Value | Token |
|-------|-------|-------|
| resting edge | 4px solid, darker shade of fill | `--btn-edge-resting: 4px` |
| pressed edge | 2px solid, same color | `--btn-edge-pressed: 2px` |
| press travel | translateY(2px) | — |

- Primary: 4px #2d54c5 (Deep Leaf) under #4f7cff fill.
- Outlined: 4px #67e8f9 (Pale Sky) under white fill.
- The edge is the ONLY shadow allowed in the system (see Don'ts). Render it as `box-shadow: 0 4px 0 <color>` — never `border-bottom` — so the press animation never changes the button's box size or shifts surrounding layout.

### Layout

- **Page max-width:** 1200px
- **Section gap:** 80-120px
- **Card padding:** 16-24px
- **Element gap:** 12px

## Components

### Primary CTA Button
**Role:** Filled green button for 'Get started' and top-of-page conversion

Fill #4f7cff, white text, nexlearn-sans 700 at 15px uppercase with 0.0530em tracking, 12px border-radius, 16px horizontal padding. No side border — color alone carries the button. Duolingo-style 3D press edge: a 4px bottom edge in #2d54c5 (Deep Leaf) rendered as `box-shadow: 0 4px 0` so pressing never shifts layout. On press (`:active`): `translateY(2px)` and the edge compresses to 2px. Hover only darkens slightly (`brightness(0.95)`), no lift. Sits directly on white canvas.

### Outlined Account Button
**Role:** Secondary CTA below primary on hero

White fill, text in #22d3ee, nexlearn-sans 700 at 14px, 12px border-radius, 16px horizontal padding, 2px solid border in #5f6d94 on top/sides. Duolingo-style 3D press edge: a 4px bottom edge in #67e8f9 (Pale Sky) rendered as `box-shadow: 0 4px 0` so pressing never shifts layout. On press (`:active`): `translateY(2px)` and the edge compresses to 2px. Pairs with the green CTA as a tactile ghost alternative.

### Nav Language Pill
**Role:** Language selector in top header

Transparent fill, text in #93a0c4 at 15px uppercase with 0.0530em tracking, 12px border-radius, 10px vertical and 16px horizontal padding, 2px solid border in #5f6d94. Behaves like a sticker tag.

### Section Headline
**Role:** Display heading for marketing sections

feather 700 at 48-64px, line-height 1.2, letter-spacing -0.0200em, color #4f7cff. The signature voice of the brand — large, rounded, unmistakably green.

### Hero Headline
**Role:** Opening page headline above CTA

nexlearn-sans 700 at 32px, color #dbe3f5 (Charcoal). Stays neutral so the green CTA below it carries the color weight.

### Body Paragraph
**Role:** Marketing body text in sections

nexlearn-sans 500 at 17px, line-height 1.18, color #93a0c4 (Pencil Gray). Mid-gray intentionally recedes so colored headlines dominate.

### Footer Background
**Role:** Full-width green band at bottom

#4f7cff fill, white and #ddd6fe text labels, generous 48px vertical padding, contains language grid and site links. The colored surface that anchors the page.

### Footer Link Item
**Role:** Text links in footer nav

nexlearn-sans at small sizes, color #a5ed6 (Fresh Leaf) for links, white for section headers. 8px margin between items, stacked vertically.

### Language Flag Pill
**Role:** Language selector in mid-page band

Circular flag emoji + language name in nexlearn-sans 700 at 15px uppercase, inline arrangement with 10-12px gaps, no background fill.

### App Store Badge
**Role:** Download badge for mobile apps

Black rectangular badge with white icon and nexlearn-sans text, 4b4b4b text color. Functions as a visual anchor on white sections.

### Section Feature Illustration
**Role:** Decorative mascot illustration beside text

Flat colored mascot characters placed in the right half of each section, no container or background. Illustrations carry the secondary palette (pink, purple, yellow, orange) while UI stays green/blue.

## Do's and Don'ts

### Do
- Use #4f7cff for any heading or CTA that needs to read as 'progress' or 'go' — it is the only saturated color allowed on large display text.
- Set display headlines at 48-64px in feather 700 with -0.0200em letter-spacing; this rounded weight is the brand voice.
- Give every button and pill a 12px border-radius and pair it with a 2px solid border in #5f6d94 or color — outlined buttons are first-class citizens, not a fallback.
- Give every button a chunky 4px bottom press-edge in a darker shade of its fill (#2d54c5 under green, #67e8f9 under white) that compresses to 2px with a 2px downward travel on press. This bottom edge is the single allowed exception to the no-shadows rule.
- Reserve uppercase at 15px with 0.0530em tracking for nav labels and language pills; never apply it to body copy.
- Keep body text in #93a0c4 at 17px/500 — mid-gray is the default so colored elements can lead.
- Use #22d3ee (Spark Blue) exclusively for interactive links and outlined secondary CTAs; it is the 'curious' companion to the green.
- Build sections as white-on-white with illustrations floating beside text; introduce #4f7cff only at the footer band and within display headings.

### Don't
- Don't put colored text in body paragraphs — body stays in #93a0c4 or #dbe3f5 so the green headlines own the page.
- Don't use sharp corners; even small tags and pills use 12px radius.
- Don't introduce gradients, glass effects, or drop shadows — NexLearn's surfaces are flat sticker-like fills with thick borders. The ONLY shadow allowed anywhere is the 4px button bottom press-edge defined above.
- Don't use feather at sizes below 48px; it is a display face only. Subheadings 19-32px use nexlearn-sans 700.
- Don't place CTA buttons on colored backgrounds without testing contrast — green on green or blue on green will disappear.
- Don't apply the secondary palette (pink, purple, mascot illustration colors) to UI chrome; those colors live only inside character art.
- Don't stretch the green to small UI text; #4f7cff is for headings, CTA fills, and the footer band, not body or link text.
- Don't use emoji anywhere in the UI — use lucide-react icons (Flame, Zap, Trophy, Heart, …) for streaks, levels, badges, and decorations.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Paper White | `#ffffff` | Page canvas — every section sits on pure white |
| 1 | Storybook Green | `#ddd6fe` | Soft tint wash behind highlighted footer labels |
| 2 | Eager Green | `#4f7cff` | Footer band and primary CTA fills — bold colored surface |
| 3 | Night Ink | `#312e81` | Deep accent surface for emphasis text and dark CTAs |

## Imagery

Illustration-driven storybook language: flat 2D mascot characters (the owl Duo and diverse human figures) with rounded geometric shapes, bold black outlines, and a secondary palette of pink, purple, yellow, orange, and blue that never appears in the UI chrome itself. Illustrations sit beside text in the right half of each section on pure white, no containers or backgrounds. Photography is absent — the characters are the visual content. Iconography uses thick outlined strokes consistent with the mascot style. Image density is moderate: each section gets one large character illustration, leaving the rest of the page to typography and whitespace.

## Layout

Single-column full-width sections stacked vertically, each ~800-900px tall. Max content width ~1200px centered. Sections alternate text-left/illustration-right with generous vertical breathing room (80-120px between sections). No card grids or multi-column feature layouts — each section is a single text block paired with one illustration. Navigation is a minimal top bar with logo and language selector, reappearing as a sticky bar between sections. Footer is a full-bleed green band spanning the page width. The rhythm is editorial: headline, paragraph, CTA, illustration, repeat.

## Agent Prompt Guide

Quick Color Reference:
- text (heading): #4f7cff
- text (body): #93a0c4
- text (hero/heading dark): #dbe3f5
- background (page): #ffffff
- background (footer band): #4f7cff
- border (outlined button): #5f6d94
- button edge (primary press-edge): #2d54c5
- button edge (outlined press-edge): #67e8f9
- accent (interactive link): #22d3ee
- primary action: no distinct CTA color

Example Component Prompts:
No distinct primary action color was observed; use the extracted neutral button treatments instead of inventing a filled CTA color.
3. Section Headline: feather 700 at 48px, line-height 1.2, letter-spacing -0.0200em, color #4f7cff. Used for 'free. fun. effective.' and similar section titles.
5. Body Paragraph: nexlearn-sans 500 at 17px, line-height 1.18, color #93a0c4, max-width ~480px to keep reading comfortable.

## Similar Brands

- **Headspace** — Same mascot-led illustration system with thick outlines and a single saturated accent color against white canvas
- **Babbel** — Light-mode language-learning landing pages with rounded display type and green as the primary CTA color
- **Khan Academy Kids** — Flat rounded mascots, playful rounded display headings, and bold sticker-style buttons with thick borders
- **Memrise** — Minimal white-canvas marketing pages with one dominant green and casual rounded display typography
- **ClassDojo** — Playful rounded mascot illustrations, thick outlined UI components, and bright single-accent CTAs on white backgrounds

## Quick Start

### CSS Custom Properties

```css
:root {
  /* Colors */
  --color-nex-blue: #4f7cff;
  --color-soft-violet: #ddd6fe;
  --color-electric-cyan: #22d3ee;
  --color-nex-blue-soft: #a5ed6e;
  --color-indigo-ink: #312e81;
  --color-paper-white: #ffffff;
  --color-charcoal: #dbe3f5;
  --color-steel: #93a0c4;
  --color-dim-steel: #5f6d94;
  --color-nex-blue-deep: #2d54c5;
  --color-pale-cyan: #67e8f9;

  /* Typography — Font Families */
  --font-feather: 'feather', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-body: 'nexlearn-sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 13px;
  --leading-caption: 1.23;
  --text-nav-label: 15px;
  --leading-nav-label: 1.33;
  --tracking-nav-label: 0.795px;
  --text-body: 17px;
  --leading-body: 1.18;
  --text-subheading: 19px;
  --leading-subheading: 1.4;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.2;
  --text-heading: 48px;
  --leading-heading: 1.2;
  --tracking-heading: -0.96px;
  --text-display: 64px;
  --leading-display: 1.2;
  --tracking-display: -1.28px;

  /* Typography — Weights */
  --font-weight-medium: 500;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-unit: 4px;
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;

  /* Layout */
  --page-max-width: 1200px;
  --section-gap: 80-120px;
  --card-padding: 16-24px;
  --element-gap: 12px;

  /* Border Radius */
  --radius-xl: 12px;

  /* Named Radii */
  --radius-links: 12px;
  --radius-buttons: 12px;
  --radius-nav-items: 12px;

  /* Surfaces */
  --surface-paper-white: #ffffff;
  --surface-soft-violet: #ddd6fe;
  --surface-nex-blue: #4f7cff;
  --surface-indigo-ink: #312e81;
}
```

### Tailwind v4

```css
@theme {
  /* Colors */
  --color-nex-blue: #4f7cff;
  --color-soft-violet: #ddd6fe;
  --color-electric-cyan: #22d3ee;
  --color-nex-blue-soft: #a5ed6e;
  --color-indigo-ink: #312e81;
  --color-paper-white: #ffffff;
  --color-charcoal: #dbe3f5;
  --color-steel: #93a0c4;
  --color-dim-steel: #5f6d94;
  --color-nex-blue-deep: #2d54c5;
  --color-pale-cyan: #67e8f9;

  /* Typography */
  --font-feather: 'feather', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-body: 'nexlearn-sans', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

  /* Typography — Scale */
  --text-caption: 13px;
  --leading-caption: 1.23;
  --text-nav-label: 15px;
  --leading-nav-label: 1.33;
  --tracking-nav-label: 0.795px;
  --text-body: 17px;
  --leading-body: 1.18;
  --text-subheading: 19px;
  --leading-subheading: 1.4;
  --text-heading-sm: 32px;
  --leading-heading-sm: 1.2;
  --text-heading: 48px;
  --leading-heading: 1.2;
  --tracking-heading: -0.96px;
  --text-display: 64px;
  --leading-display: 1.2;
  --tracking-display: -1.28px;

  /* Spacing */
  --spacing-8: 8px;
  --spacing-12: 12px;
  --spacing-16: 16px;
  --spacing-24: 24px;
  --spacing-32: 32px;
  --spacing-40: 40px;
  --spacing-48: 48px;
  --spacing-64: 64px;
  --spacing-80: 80px;
  --spacing-96: 96px;

  /* Border Radius */
  --radius-xl: 12px;
}
```