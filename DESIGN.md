# in.torma design direction — monochrome press

## Brand

- in.torma is an Indonesian design & print studio for identity, posters, social content, packaging, spanduk, kartu nama, and related creative work.
- Use `public/int.svg` as the full wordmark (light artwork, for dark backgrounds) and `public/icon.svg` as the symbol (dark gradient artwork, place on a light chip). Do not redraw, crop, recolor, or typeset a substitute logo.
- Preserve the tagline “Creative without idea” wherever the full wordmark appears.

## Art direction: monochrome press

The site is styled as a modern print production floor: near-black press steel,
paper-white ink, registration marks, crop corners, and real Code39 barcodes.
Surfaces are monochrome; the only chromatic accent is blue `#0070f3`, with
`#3291ff` for small text on dark panels. Green is never used, red is reserved
for danger/error. No colored glow — hierarchy comes from luminance, weight,
borders, and pattern (solid / dashed / strike).

### Signature shape

Every button, card, input, pill, dialog, and ticket uses the intorma corner
pattern: **top-left, top-right, bottom-right rounded; bottom-left square**.
Tailwind radius tokens carry the pattern as a four-value `border-radius`:

| Token | Value | Use |
| --- | --- | --- |
| `rounded-tag-sm` | `0.375rem 0.375rem 0.375rem 0` | inputs, tags, badges, small buttons |
| `rounded-tag` | `0.5rem 0.5rem 0.5rem 0` | buttons, cards, panels |
| `rounded-tag-lg` | `0.75rem 0.75rem 0.75rem 0` | dialogs, large panels |

CSS custom properties: `--radius` is the scalar (`8px`), `--radius-sharp` is
the four-value pattern (`8px 8px 8px 0`) used by `.btn`, `.card`, `.input`,
`.tag`, and `rounded-[var(--radius-sharp)]`. Side-specific utilities
(`rounded-l-*`) must not use these tokens; use explicit corner values.
Dots, progress bars, radios, and spinners stay `rounded-full`.

Ikon aplikasi (`.ico`, `.icns`, PNG launcher/PWA, dan `public/icon.svg`) saat ini masih
menggunakan keempat sudut membulat. Ini adalah pengecualian yang disengaja untuk aset merek;
komponen antarmuka wajib tetap mengikuti pola sudut kiri bawah tajam. Regenerasi ikon harus
dilakukan sekaligus untuk semua platform bila keputusan merek berubah.

### Palette

Nama di kolom pertama adalah CSS custom properties di `src/app/globals.css`; Tailwind
meng-ekspos sebagian sebagai token (`bg`, `panel`, `line`, `mute`, `ink`, `accent`) dan
sebagian lagi sebagai alias (`carbon`, `border`, `faint`, `quiet`, `accent.deep/soft`).
Keduanya merujuk ke warna yang sama; jangan menambah hex baru di komponen.

| Token | Hex | Role |
| --- | --- | --- |
| `bg` | `#09090b` | page background (near-black) |
| `panel` | `#111113` | raised surface |
| `sand` | `#18181b` | inset surface / alternate section |
| `line` | `#27272a` | hairline borders |
| `mute` | `#a1a1aa` | secondary text / quiet notices |
| `ink` | `#fafafa` | primary text & primary action fill |
| `accent` | `#0070f3` | functional blue (border, fill, focus) |
| `accent.strong` | `#3291ff` | small text on dark panels |
| `danger` | `#ef4444` | cancellation and errors only |

Status tones have one source of truth in `src/lib/status.ts`: menunggu=gray,
dikerjakan=blue, revisi=light gray, selesai=white, batal=red. Badges, dots,
steppers, timelines, and admin views must read from `STATUS_META` instead of
defining per-page colors. Patterns, not new hues, separate adjacent tones.

### Typography

- Display/body: Instrument Sans (variable, local `next/font/local`).
- Editorial accent: Instrument Serif italic for one emphasized word per heading
  ("kelihatan.", "Nggak masalah.", "tanpa ribet.") with a grayscale underline
  rule; the hero word uses a white→silver→steel gradient clip.
- Data voice: system monospace stack for codes, prices, labels, eyebrows,
  barcodes captions — uppercase, tracked, tabular-nums.

### Signature elements (komponen yang benar-benar ada)

- `ScrollProgress` — 2px progress bar di atas halaman.
- `StatusBadge` / `STATUS_META` — satu sumber warna status (menunggu, dikerjakan,
  revisi, selesai, batal); jangan membuat warna status per halaman.
- `ProductIllustration`, `ServiceIcon`, `BankLogo`, `PaymentLogo` — ilustrasi dan
  logo layanan/pembayaran, semuanya monokrom atau biru.
- `MobileSheet` — bottom sheet/drawer dengan backdrop, drag-to-close, focus trap,
  scroll lock, dan konsumsi tombol back Android lewat `useOverlayRegistration`.
- `Toast` — notifikasi `aria-live` dengan swipe-to-dismiss; posisinya mengikuti
  tinggi action bar aktif, bukan asumsi 56px.
- `CameraCapture` — panduan + contoh baik/buruk, izin setelah tap, galeri sebagai
  fallback utama, pratinjau sebelum pakai foto.
- `StateView` — `EmptyState`, `ErrorState`, `LoadingState`: satu ritme untuk
  katalog, portal, dan pustaka file.
- Radius khas `8px 8px 8px 0` berasal dari `--radius-sharp`. Tidak ada
  `Press.tsx` atau `.ticket` di codebase saat ini.

### Interaction rules

- Primary button: aksen biru `#0070f3`, teks terang, tanpa glow; hover ke `#3291ff`.
- Active nav/filter: bidang biru/underline; bottom nav hanya navigasi, bukan aksi.
- Status pills (admin): `.status-pill` dengan `--pill` dari `STATUS_META` dan
  `data-tone` (`solid` / `dashed` / `strike`); checked state lewat `color-mix`.
- Service radio cards: aksen biru untuk Desain, garis putus-putus untuk Cetak.
- Quantity stepper: ± ber-48px di mobile, total langsung di ringkasan dan bar bawah.
- Destructive actions: konfirmasi jelas dengan teks danger; tidak memakai hijau.
- Error/alert blocks: merah hanya untuk danger/error; teks pendukung tetap monokrom.
- Target sentuh ≥48px dan input ≥16px di ≤640px; semua motion mati dengan
  `prefers-reduced-motion`.

## Interface

- Lead with clear Indonesian copy and direct paths to order or track a job.
- Prices and turnaround estimates come only from service data. Do not fabricate
  customer logos, metrics, testimonials, or delivery promises.
- Keep pages responsive, keyboard accessible, and readable at high contrast.
  Descriptive alt text for meaningful images; visible ink focus states.
- PWA: public pages cached by `sw.js` (cache name `intorma-v28`); `/admin` and
  `/api` are never cached. Theme color memakai obsidian `#09090b`.