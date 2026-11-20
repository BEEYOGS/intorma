# in.torma design direction — monochrome press

## Brand

- in.torma is an Indonesian design & print studio for identity, posters, social content, packaging, spanduk, kartu nama, and related creative work.
- Use `public/int.svg` as the full wordmark (light artwork, for dark backgrounds) and `public/icon.svg` as the symbol (dark gradient artwork, place on a light chip). Do not redraw, crop, recolor, or typeset a substitute logo.
- Preserve the tagline “Creative without idea” wherever the full wordmark appears.

## Art direction: monochrome press

The site is styled as a modern print production floor rendered entirely in the
brand's five-tone grayscale ramp: near-black press steel, paper-white ink,
paper tickets, registration marks, crop corners, and real Code39 barcodes.
No chromatic color anywhere — hierarchy comes from luminance, weight, and
pattern (solid / dashed / strike), never from hue.

### Signature shape

Every button, card, input, pill, dialog, and ticket uses the intorma corner
pattern: **top-left, top-right, bottom-right rounded; bottom-left square**.
Tailwind radius tokens carry the pattern as a four-value `border-radius`:

| Token | Value | Use |
| --- | --- | --- |
| `rounded-tag-xs` | `0.35rem … 0` | day cells, checkboxes, micro chips |
| `rounded-tag-sm` | `0.7rem … 0` | inputs, tags, pills, small buttons |
| `rounded-tag` | `1.1rem … 0` | primary buttons, service cards |
| `rounded-tag-lg` | `1.6rem … 0` | panels, dialogs, forms |
| `rounded-tag-xl` | `2.2rem … 0` | hero spec sheet, feature cards |

Side-specific utilities (`rounded-l-*`) must not use these tokens (four-value
shorthand is invalid per-corner); use arbitrary values like
`rounded-[0_0.7rem_0.7rem_0]` for joined input groups.

### Palette (Tailwind tokens)

| Token | Hex | Role |
| --- | --- | --- |
| `paper` | `#070809` | page background (near-black) |
| `panel` | `#14161a` | raised surface |
| `sand` | `#0e1013` | inset surface / alternate section |
| `line` | `#2b2f33` | hairline borders |
| `coal` | `#3a3d3d` | scrollbar thumb, dark chips |
| `ash` | `#6d7275` | "batal" status, cancelled cues |
| `steel` | `#8a8d8e` | tertiary accent, "menunggu" |
| `mute` | `#9ba0a3` | secondary text |
| `silver` | `#c6c8c9` | secondary accent, "dikerjakan", danger text |
| `ink` | `#f5f7f9` | primary text & primary action fill |

Status tones are fixed in `src/lib/status.ts`: menunggu=steel,
dikerjakan=silver, revisi=ink (dashed), selesai=white (solid fill, dark text),
batal=ash (strike). Reuse them everywhere (badges, dots, steppers, timeline,
admin pills) — never invent per-page variants. Patterns, not hues, separate
adjacent tones.

### Typography

- Display/body: Instrument Sans (variable, local `next/font/local`).
- Editorial accent: Instrument Serif italic for one emphasized word per heading
  ("kelihatan.", "Nggak masalah.", "tanpa ribet.") with a grayscale underline
  rule; the hero word uses a white→silver→steel gradient clip.
- Data voice: system monospace stack for codes, prices, labels, eyebrows,
  barcodes captions — uppercase, tracked, tabular-nums.

### Signature elements (`src/components/Press.tsx`)

- `Barcode` — genuine Code39 SVG (start/stop `*`, quiet zone). Used on tickets,
  order rows, hero spec sheet, footer. Sanitizes input to the Code39 charset.
- `RegMark` — crosshair registration mark for eyebrows and section headers.
- `CropCorners` — four corner crop marks on feature cards and dialogs.
- `ToneChips` — four tiny grayscale squares (ink/silver/steel/paper) as a brand flourish.
- `Reveal` — IntersectionObserver fade/rise, once, honors reduced motion.
- `Ticker` — marquee of service names between hero and services.
- `PressBackground` — fixed layered white/silver/steel glows (very low alpha),
  feTurbulence grain, dot grid. `ScrollProgress` — 2px ink→silver→steel top bar.
- `.ticket` (globals.css) — light paper card with perforated edges (radial-gradient
  mask) and the signature radius, dark ink text; used for bank payment card and
  tracking ticket.

### Interaction rules

- Primary button: ink fill, near-black text, hover → white + white glow.
- Active nav/filter: ink fill or ink underline; scrollspy on home anchors.
- Status pills (admin): `.status-pill` with `--pill` CSS variable per status and
  `data-tone` (`solid` / `dashed` / `strike`); checked state tints via `color-mix`.
- Service radio cards: ink accent for Desain group, silver for Cetak group.
- Quantity stepper: ± buttons, live total in sticky summary and mobile bottom bar.
- Destructive actions: dashed silver zone + dialog that requires typing the order code.
- Error/alert blocks: dashed silver border (pattern = warning, no red).
- All motion disabled under `prefers-reduced-motion`.

## Interface

- Lead with clear Indonesian copy and direct paths to order or track a job.
- Prices and turnaround estimates come only from service data. Do not fabricate
  customer logos, metrics, testimonials, or delivery promises.
- Keep pages responsive, keyboard accessible, and readable at high contrast.
  Descriptive alt text for meaningful images; visible ink focus states.
- PWA: public pages cached by `sw.js` (cache name `intorma-v3`); `/admin` and
  `/api` are never cached. Manifest theme matches `paper`.