# in.torma design direction — "ruang cetak"

## Brand

- in.torma is an Indonesian design & print studio for identity, posters, social content, packaging, spanduk, kartu nama, and related creative work.
- Use `public/int.svg` as the full wordmark (light artwork, for dark backgrounds) and `public/icon.svg` as the symbol (dark gradient artwork, place on a light chip). Do not redraw, crop, recolor, or typeset a substitute logo.
- Preserve the tagline “Creative without idea” wherever the full wordmark appears.

## Art direction: ruang cetak (the press room)

The site is styled as a modern print production floor: CMYK process inks on dark
press steel, paper tickets, registration marks, crop corners, and real Code39
barcodes. Every decorative element is borrowed from printing, not from generic
dashboard UI.

### Palette (Tailwind tokens)

| Token | Hex | Role |
| --- | --- | --- |
| `paper` | `#0b0d10` | page background (press steel, near-black cool) |
| `panel` | `#13161c` | raised surface |
| `sand` | `#0f1218` | inset surface / alternate section |
| `line` | `#252b35` | hairline borders |
| `ink` | `#f2efe6` | primary text (warm paper white) |
| `mute` | `#8e97a6` | secondary text (cool gray) |
| `cyan` | `#2ee6ff` | process C — primary action, active nav, focus |
| `magenta` | `#ff3d8e` | process M — print services, serif-italic accents, admin tag |
| `yellow` | `#ffd23f` | process Y — warnings, "menunggu" status |
| `green` | `#3fe08c` | success, "selesai", lunas |
| `red` | `#ff5c5c` | danger, "batal", delete zones |
| `blue` | `#5aa7ff` | informational spare |

Status colors are fixed in `src/lib/status.ts`: menunggu=yellow,
dikerjakan=cyan, revisi=magenta, selesai=green, batal=red. Reuse them everywhere
(badges, dots, steppers, timeline, admin pills) — never invent per-page variants.

### Typography

- Display/body: Instrument Sans (variable, local `next/font/local`).
- Editorial accent: Instrument Serif italic for one emphasized word per heading
  ("kelihatan.", "Nggak masalah.", "tanpa ribet.") with a CMYK underline rule.
- Data voice: system monospace stack for codes, prices, labels, eyebrows,
  barcodes captions — uppercase, tracked, tabular-nums.

### Signature elements (`src/components/Press.tsx`)

- `Barcode` — genuine Code39 SVG (start/stop `*`, quiet zone). Used on tickets,
  order rows, hero spec sheet, footer. Sanitizes input to the Code39 charset.
- `RegMark` — crosshair registration mark for eyebrows and section headers.
- `CropCorners` — four corner crop marks on feature cards and dialogs.
- `CmykChips` — four tiny ink squares (C/M/Y/K) as a brand flourish.
- `Reveal` — IntersectionObserver fade/rise, once, honors reduced motion.
- `Ticker` — marquee of service names between hero and services.
- `PressBackground` — fixed layered glows (cyan/magenta/yellow, very low alpha),
  feTurbulence grain, dot grid. `ScrollProgress` — 2px C→M→Y top bar.
- `.ticket` (globals.css) — light paper card with perforated edges (radial-gradient
  mask), dark ink text; used for bank payment card and tracking ticket.

### Interaction rules

- Primary button: cyan fill, near-black text, hover → white + cyan glow.
- Active nav/filter: cyan fill or cyan underline; scrollspy on home anchors.
- Status pills (admin): `.status-pill` with `--pill` CSS variable per status;
  checked state tints border/background via `color-mix`.
- Service radio cards: cyan accent for Desain group, magenta for Cetak group.
- Quantity stepper: ± buttons, live total in sticky summary and mobile bottom bar.
- Destructive actions: red-bordered zone + dialog that requires typing the order code.
- All motion disabled under `prefers-reduced-motion`.

## Interface

- Lead with clear Indonesian copy and direct paths to order or track a job.
- Prices and turnaround estimates come only from service data. Do not fabricate
  customer logos, metrics, testimonials, or delivery promises.
- Keep pages responsive, keyboard accessible, and readable at high contrast.
  Descriptive alt text for meaningful images; visible cyan focus states.
- PWA: public pages cached by `sw.js` (cache name `intorma-v2`); `/admin` and
  `/api` are never cached. Manifest theme matches `paper`.