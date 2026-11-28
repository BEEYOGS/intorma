# Riset & rencana UX mobile in.tarma

Disusun 28 Nov 2026. Fokus: pengalaman mobile menyeluruh (PWA + wrapper APK), bukan hanya alur kamera. Prinsip yang dipilih harus tetap selaras dengan identitas visual in.tarma: monokrom + biru `#0070f3`, teks kecil `#3291ff`, tanpa glow, sudut kiri bawah tajam, tidak sesak, dan mulus di layar sentuh.

## Sumber primer

| Sumber | Pokok yang dipakai |
| --- | --- |
| [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Layout harus adaptif terhadap ukuran/orientasi; gunakan margin & padding konsisten; beri ruang bernapas antar grup; hormati safe area. Hindari kontrol penting di tepi yang tertutup sistem. |
| [Apple HIG — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) | Tab bar untuk **navigasi antar bagian tingkat atas**, bukan untuk tombol aksi. Bar terlihat konsisten di semua tab; jumlah tab dibatasi; hindari tab overflow/tersembunyi; jika konten kosong, jelaskan, jangan sembunyikan tab. |
| [Apple HIG — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) | Sheet untuk tugas **scoped** yang masih terkait konteks saat ini. Sediakan `Batal`/`Tutup`, `Selesai`, dan `Kembali` untuk alur bertahap. Sheet bisa modal atau nonmodal tergantung kebutuhan. |
| [Apple HIG — Typography](https://developer.apple.com/design/human-interface-guidelines/typography) | Default iOS 17 pt, minimum 11 pt; naikkan ukuran jika weight tipis; uji keterbacaan pada jarak dan kondisi berbeda; naikkan kontras bila perlu. |
| [MDN — CSS `env()`](https://developer.mozilla.org/en-US/docs/Web/CSS/env) | `env(safe-area-inset-*)` untuk menghormati area aman perangkat (notch, home indicator). |
| [web.dev — Responsive web design basics](https://web.dev/articles/responsive-web-design-basics) | Layout harus merespons lebar layar, gunakan meta viewport, hindari lebar tetap, dan pastikan konten tidak perlu zoom horizontal. |
| [W3C WCAG 2.2 — Target Size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) & [web.dev — Tap targets](https://web.dev/articles/accessible-tap-targets) | Target minimum 24 px (AA), 44 px (AAA); rekomendasi praktis 48×48 px dengan jarak 8 px. |
| [MDN — `100dvh`](https://developer.mozilla.org/en-US/docs/Web/CSS/length) | `dvh` mengikuti tinggi viewport dinamis saat toolbar browser muncul/hilang; lebih stabil daripada `vh` di mobile. |

## Prinsip desain yang dipakai

1. **Satu sistem navigasi.** Bottom nav hanya berisi tujuan utama. Aksi kontekstual (tambah, bayar, kirim) memakai toolbar/sticky action bar di atas bottom nav—bukan menambah tab.
2. **Thumb zone dulu.** CTA utama berada di bawah konten dan di atas safe area, tidak tersembunyi oleh keyboard atau bottom nav. Tombol sekunder tetap 48px walau visualnya lebih ringan.
3. **Grid 8 pt + hierarki 4 level.** Spacing kelompok 8/16/24/32; tipografi 12/14/16/17–20/24. Teks≥16px untuk input agar iOS tidak auto-zoom; label pendukung boleh lebih kecil tapi kontras.
4. **Safe area & viewport dinamis.** `100dvh`, `padding-bottom: calc(64px + env(safe-area-inset-bottom))` pada konten dengan bottom nav, `overflow-x: clip` di root.
5. **Sheet yang bisa dibatalkan.** Setiap overlay punya backdrop, tombol tutup, konsumsi tombol back Android, dan fokus kembali ke elemen pemicu saat ditutup.
6. **State bukan dekorasi.** Loading, empty, error, dan success punya pola yang sama di semua halaman: ikon/ilustrasi seperlunya, satu kalimat jelas, satu aksi utama.
7. **Gerakan minimal.** Transisi ≤200ms, tanpa glow; `prefers-reduced-motion` menonaktifkan animasi non-esensial.

## Hasil audit codebase

Audit menyeluruh terhadap komponen customer tidak menemukan P0. Yang sudah baik dipertahankan: bottom nav 56px + safe area, `overflow-x: clip`, input 16px, `MobileSheet` dengan focus trap/drag/back Android, dan pola install pasif.

| Prioritas | Area | Temuan | Dampak |
| --- | --- | --- | --- |
| P1 | Safe-area atas | `.topbar` memakai `top-0` tanpa `env(safe-area-inset-top)` walau viewport `viewportFit: cover` | Logo/menu tertutup status bar APK atau notch |
| P1 | `/katalog` | Bar filter pinned ±124px tapi spacer hanya `mt-16` (64px) | Hasil pertama tertutup filter saat pinned |
| P1 | `/katalog`, `/order`, `/bayar`, `/lacak`, `/masuk` | Chip, filter, quick size, radio pembayaran, tab auth, dan riwayat masih 36–44px | Salah ketuk di layar kecil |
| P1 | `/order` | Promo hanya ada di aside desktop; ringkasan/sticky menampilkan `total`, bukan `finalTotal`; CTA submit dobel | Mobile tidak bisa pakai promo dan angka bisa beda |
| P1 | Toast/install | Offset bawah memakai asumsi nav 56px, bukan tinggi action bar aktif | Toast/kartu install menimpa CTA saat error |
| P2 | Overlay | Handle drag sheet hanya 20px | Area geser sempit |
| P2 | Konsistensi | Warna hard-coded, state empty tiap halaman ditulis manual, dokumen desain menyebut komponen yang tidak ada | Drift desain |

## Rencana & implementasi

| Prioritas | Perubahan | File terdampak | Status |
| --- | --- | --- | --- |
| P1 | Token `--topbar-offset` dipakai `.topbar`, `scroll-padding-top`, dan bar filter pinned | `globals.css`, `TopBar` (via CSS), `CatalogBrowser` | Dibangun |
| P1 | Spacer katalog mengikuti tinggi bar pinned sebenarnya (128px) | `CatalogBrowser.tsx` | Dibangun |
| P1 | Target non-`.btn` dinaikkan ke 48px: chip/filter, quick size, radio pembayaran, tanggal/jam, tab auth, riwayat | `CatalogBrowser`, `OrderForm`, `PaymentMethodPicker`, `DateField`, `TimeField`, `CustomerAuthForm`, `RecentOrders` | Dibangun |
| P1 | Promo tersedia di ringkasan mobile; ringkasan & sticky menampilkan `finalTotal`; CTA inline hanya tampil di desktop | `OrderForm.tsx` | Dibangun |
| P1 | `--bottom-overlay-offset` diukur dari action bar aktif via `ResizeObserver` | `OrderForm.tsx` | Dibangun |
| P2 | Area drag sheet 20px → 40px | `MobileSheet.tsx` | Dibangun |
| P2 | `EmptyState`/`ErrorState`/`LoadingState` dipakai di katalog, portal, pustaka file | `StateView.tsx` + halaman terkait | Dibangun |
| P2 | Focus trap & restore fokus menu mobile | `MobileNav.tsx` | Dibangun |
| P2 | Warna hard-coded kamera/status → token | `CameraCapture.tsx`, `lacak/[kode]/page.tsx` | Dibangun |
| P2 | `DESIGN.md` diselaraskan dengan komponen yang ada | `DESIGN.md` | Dibangun |
| P1 | Back Android memakai index `history.state`, tidak inkremental saat `popstate`; deep-link kembali ke beranda sebelum exit | `AppBackHandler.tsx` | Dibangun |
| P2 | Popup install tidak auto-close; fokus terjebak di dialog dan kembali ke tombol pembuka | `PWA.tsx`, `globals.css` | Dibangun |
| P2 | Live region toast selalu ada di DOM sebelum pesan disisipkan | `Toast.tsx` | Dibangun |
| P2 | Status paid/expired pembayaran diumumkan ke screen reader | `PaymentPoller.tsx` | Dibangun |
| P3 | Sisa kontrol 44px (label layanan, summary, link teks, jam/menit, rating, footer) dinaikkan ke 48px | `OrderForm`, `TimeField`, `ReviewForm`, `Chrome`, `app/page`, `lacak/[kode]`, `bayar/[kode]`, `portal/files`, `masuk`, `download`, `TopBar`, admin | Dibangun |
| P3 | `rootMargin` filter katalog mengikuti tinggi topbar asli | `CatalogBrowser.tsx` | Dibangun |
| P3 | Error harga sticky tidak di-truncate dan memakai `role="alert"` | `OrderForm.tsx` | Dibangun |
| P3 | Focus trap sheet memfilter elemen tersembunyi | `MobileSheet.tsx` | Dibangun |
| Cerdas | Riwayat pencarian katalog disimpan lokal (maks. 5), bisa dipakai ulang dan dihapus | `CatalogBrowser.tsx` | Dibangun |
| Cerdas | Saran deadline "Paling cepat/+1/+3 hari" memakai hari kalender WIB dan batas layanan | `OrderForm.tsx`, `lib/deadline.ts` | Dibangun |
| Cerdas | Contoh brief sesuai kategori mengisi tujuan/audiens/gaya/elemen wajib | `BriefAssistant.tsx` | Dibangun |
| Cerdas | Status offline/online tampil sebagai notifikasi pasif di live region yang sama | `Toast.tsx` | Dibangun |
| Cerdas | Petunjuk pembayaran menyesuaikan sisa waktu dan tetap menjelajahi tiap 5 detik saat aktif | `PaymentPoller.tsx` | Dibangun |
| Final | Satu `main landmark` global untuk semua halaman; skip link tidak lagi menuju ID ganda | `layout.tsx` + halaman | Dibangun |
| Final | Target 48px ditegakkan di CSS mobile sehingga `!h-10`/`min-h-9` tidak bisa mengalahkan | `globals.css` | Dibangun |
| Final | Fallback error global memakai tombol 48px dan sudut tajam | `global-error.tsx` | Dibangun |
| Final | Konfirmasi hapus akun/opsi pakai sheet dengan fokus terjebak, Escape, dan restore fokus; tanpa `window.confirm` | `ConfirmSheet.tsx`, `AdminAccountManager.tsx`, `OptionForms.tsx`, `MobileSheet.tsx` | Dibangun |
| Final | Popover tanggal/jam desktop memakai dialog modal, fokus awal, jebakan Tab, Escape, dan restore fokus | `DateField.tsx`, `TimeField.tsx` | Dibangun |
| Final | Status manual pembayaran diumumkan lewat live region; error ditampilkan merah dan hitung mundur dibaca jelas | `PaymentPoller.tsx` | Dibangun |
| Final | Kontrol admin/pustaka file/lacak dan pratinjau file disamakan ke target 48px, label dialog, serta token warna | `admin/*`, `FileLibrary.tsx`, `lacak/[kode]`, `LoginForm.tsx`, `LacakForm.tsx` | Dibangun |
| Final | Menu navigasi mobile memakai pola disclosure, bukan dialog | `MobileNav.tsx` | Dibangun |
| Final | Judul menyeimbangkan baris (`text-wrap: balance`) dan scroll horizontal dicegah di level dokumen | `globals.css` | Dibangun |

## Baseline QA produksi (28 Nov 2026)

Pengukuran DOM pada alias produksi (viewport desktop emulator, bukan pengganti uji HP fisik):

| Halaman | Temuan |
| --- | --- |
| `/` | 5 CTA utama ber-36px; tidak ada overflow horizontal. |
| `/order` | Filter kategori 40px; CTA "Buat pesanan & lihat pembayaran" 36px; satu input bertuliskan 12px (memicu auto-zoom iOS); tidak ada overflow. |
| `/lacak` | Input 15px; tombol aksi 36–40px; tidak ada overflow. |
| `/download` | Semua tombol unduh 40px; tidak ada overflow. |
| `/portal/files`, `/masuk` | Halaman login, tidak ada kontrol bermasalah terdeteksi. |

Catatan: `nav` yang terdeteksi pada pengukuran ini adalah header desktop (`hidden ... sm:flex`), sehingga bottom nav customer perlu diverifikasi terpisah dari kode/layout.

## Pengecualian yang dijaga

- Warna hijau tetap dilarang; merah hanya untuk danger/error.
- Tidak ada auto-modal install PWA; penolakan 30 hari dan "Nanti" 7 hari tetap.
- `frame-ancestors 'none'` dipertahankan.
- Perubahan murni UI web; tidak menyentuh pembayaran, webhook, migrasi, atau seed database.
- Setiap perubahan UI wajib diikuti bump versi `public/sw.js` agar PWA tidak menyajikan chunk lama.
