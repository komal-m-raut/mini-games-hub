# Mettle — design system

Every token lives in the `@theme` block at the top of `app/globals.css`.
That file is the source of truth; this page explains which token to reach for.

The rule of thumb: **components choose a role, never a value.** A heading
picks a size, not a weight and a colour. A button picks a variant, not a
padding pair.

---

## Typography

Three faces, three jobs.

| Role | Token | Face | Used for |
|------|-------|------|----------|
| Display | `--font-display` | Space Grotesk | Headings, game titles, button labels |
| Body | `--font-body` | Inter | Prose, hints, rules, captions |
| Numeric | `--font-numeric` | JetBrains Mono | Scores, timers, ranks — **only** |

Space Grotesk is geometric with enough character in the a/g/y to read as
arcade rather than corporate, while keeping open counters at 14px. Inter is
built for UI at small sizes, which is most of this app.

There is deliberately **no `font-mono` utility**. Monospace was previously the
UI text font in ~60 places, which is what made the app read as a terminal
readout. Small labels use `.font-ui` (the body face) instead.

### Weights

Three, and no more. `--fw-body` 400 · `--fw-medium` 500 · `--fw-display` 600.

`.font-display` and `.font-score` **own their weight and colour**. Do not add
`font-bold` or `text-white` alongside them — that is what produced 51
`font-bold` and 7 `font-black` declarations with no hierarchy between them.

### Size and line-height

Sizes are Tailwind's own ramp (`text-xs` … `text-7xl`) plus `text-2xs`
(11px) for micro-labels. Line-heights are overridden per step — tight for
display, open for prose. Never use an arbitrary `text-[…]`.

---

## Colour

### Text — the ink ramp

| Token | Hex | Contrast on `bg-base` | Use for |
|-------|-----|----------------------|---------|
| `text-ink-1` | `#F1F5F9` | 17.2:1 | Headings, values, button labels |
| `text-ink-2` | `#C7CEDB` | 11.9:1 | Body copy (the `<body>` default) |
| `text-ink-3` | `#94A3B8` | 7.4:1 | Captions, secondary labels |
| `text-ink-4` | `#6B7688` | 4.1:1 | Decorative only — under AA, **never prose** |

Ratios are measured in-browser against `#0F0F23`. This replaced twelve
different `text-white/N` opacities, several of which (40%, 45%) sat under
4.5:1 while carrying real text.

### Surfaces and lines

`--color-surface-1/2/3` (resting / hover / pressed) and `--color-line-1/2`
(quiet divider / visible edge). Do not invent a new `rgba(255,255,255,x)`.

### Accents

Each game owns one hue, in `lib/gameRegistry.ts` as `accent`. It is threaded
into components as `--game` (cards) or `--btn-accent` (buttons). Nothing else
sets a per-game colour.

Brand cyan is `#22D3EE`, lightened from `#06B6D4`, which failed 4.5:1 as text
on the page background while being used as text in six places.

**Accent-filled controls mix toward `#0B0B1A`, not toward transparency.** A
translucent accent over a dark card goes muddy — orange came out brown — and
leaves a white label near 3:1.

---

## Buttons

One base class, three sizes, five variants. Geometry comes from four custom
properties, so a size modifier is three declarations rather than a re-spec.

```html
<button class="btn btn-primary">Play</button>
<button class="btn btn-sm btn-ghost">Today</button>
<button class="btn btn-lg btn-accent" style="--btn-accent:#F97316">Start</button>
<button class="btn btn-sm btn-ghost btn-icon" aria-label="Refresh">…</button>
```

| Size | Height | Font | Icon |
|------|--------|------|------|
| `btn-sm` | 36px (hit area expanded to 44) | 14px | 16px |
| default | **44px** | 15px | 18px |
| `btn-lg` | 52px | 17px | 20px |

Variants: `btn-primary` (the one filled action per screen) · `btn-accent`
(per-game hue) · `btn-secondary` · `btn-ghost` · `btn-danger`.
Modifiers: `btn-block`, `btn-pill`, `btn-icon`.

Icons size off `--btn-icon` — **do not put `w-4 h-4` on an icon inside a
button.** Press feedback is a 1px translate on `.btn:active`, defined once.

In React, prefer `<NeonButton>`, which is a thin wrapper over these classes.

### Same purpose, same button

Actions that recur across games must use the same variant everywhere:

| Action | Variant |
|--------|---------|
| Next / Start / Play again | `primary` |
| Menu / Back / secondary exit | `ghost` |
| Share result | `secondary` |
| Difficulty / mode choice | `secondary` + game `accent` |

---

## Radius, motion, spacing

Radius: `--radius-sm` 8 · `md` 12 · `lg` 16 · `xl` 24 · `pill` 999.
Buttons are always `md` unless explicitly `btn-pill`.

Motion: `--dur-fast` 120ms · `--dur-normal` 200ms · `--dur-slow` 320ms, with
`--ease-standard` for UI and `--ease-spring` for playful overshoot. All
animation respects `prefers-reduced-motion` via the global rule in
`globals.css`.

Spacing follows Tailwind's 4px scale. Page gutters come from
`.page-container`, never from per-page padding.
