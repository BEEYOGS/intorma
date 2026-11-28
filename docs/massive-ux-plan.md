# Rencana Masif UX in.torma — Fase 3

> Status: **rencana selesai, siap dibangun**
> Fokus: **UI/UX only**
> Tidak boleh menyentuh: backend, pembayaran, migrasi DB, seed, secret, konfigurasi server.

## 1. Tujuan

Menyempurnakan in.torma menjadi aplikasi web + wrapper APK yang:

- terasa premium,
- tidak sesak di HP,
- mulus di 320px–430px,
- konsisten dengan token monokrom + biru,
- mudah dipahami pengguna awam,
- aman untuk kamera dan upload,
- cepat dipantau admin,
- bisa dipasang sebagai PWA tanpa nag,
- tetap ringan dan dapat diakses screen reader.

## 2. Aturan desain yang tidak boleh dilanggar

- Warna: monokrom + biru `#0070f3`.
- Teks kecil: `#3291ff`.
- Hijau dilarang.
- Merah hanya untuk danger/error.
- Tanpa glow.
- Sudut kiri bawah tajam (`rounded-tag-*`).
- Target sentuh minimal 48px.
- Input/select/textarea minimal 16px.
- Safe area atas/bawah wajib.
- `overflow-x: clip`.
- `100dvh` untuk area penuh.
- Bottom nav 48px+.
- Tanpa auto-modal install.
- Install popup tidak auto-close.
- Kamera eksplisit, aman, ada panduan + contoh, tidak auto-open.
- Izin kamera diminta setelah tap.
- Jika izin ditolak/tidak tersedia, galeri menjadi aksi utama, kamera retry sekunder, tanpa nag.

## 3. Ruang lingkup

### In scope
- Halaman publik
- Halaman order
- Halaman pembayaran
- Halaman lacak
- Portal pelanggan
- Pustaka file
- Admin dashboard
- Admin detail pesanan
- PWA/install/download
- Komponen shared
- Form, dialog, sheet, toast, state view
- Aksesibilitas, fokus, live region
- Empty/loading/error state
- Offline/online
- Responsif 320px

### Out of scope
- Backend API
- Midtrans/QRIS
- Database
- Seed
- Auth DB
- Email provider
- Secret/keystore
- Migrasi

## 4. Riset yang menjadi dasar

- Apple HIG: touch target, spacing, navigation.
- Material Design: tap target, responsive grid.
- MDN: `env()`, `100dvh`, viewport fit.
- web.dev: responsive design, tap targets.
- WCAG 2.2: focus, contrast, target size, landmarks.
- ARIA APG: dialog, disclosure, live region.
- Next.js PWA: service worker, cache versioning.
- Native wrapper behavior: back button, notch, status bar, camera permission.

## 5. Rencana halaman

### 5.1 Beranda
- Hero lebih ringkas di mobile.
- CTA utama tunggal dan tidak ganda.
- Card layanan tidak terpotong.
- Review section tidak overflow.
- Footer legal tetap terbaca.
- Skeleton loading saat data lambat.

### 5.2 Katalog
- Filter pinned tidak menutup konten.
- Riwayat pencarian lokal maks. 5.
- Chip kategori 48px.
- Empty state jelas.
- Error state dengan retry.
- Search input 16px.
- No horizontal overflow.

### 5.3 Order
- Brief assistant per kategori.
- Preset deadline WIB.
- Promo mobile + total final.
- Sticky CTA tunggal.
- Overlay offset dari action bar.
- Form tidak zoom iOS.
- Error sticky tidak truncate.
- File upload fallback.
- Camera guide + example.

### 5.4 Pembayaran
- Instruksi kontekstual.
- Countdown jelas.
- Status live region.
- Manual check.
- Error merah, bukan toast pasif saja.
- Tidak ada Snap popup/redirect.

### 5.5 Lacak
- Kode pesanan mudah disalin.
- Status badge konsisten.
- Langkah berikutnya jelas.
- Pembayaran manual tetap bisa dibuka.
- File hasil bisa diunduh.

### 5.6 Portal
- Ringkasan pesanan.
- Aksi cepat.
- File saya.
- Empty state.
- Logout aman.

### 5.7 Admin
- KPI SLA 6 jam.
- Urutan deadline.
- Status overdue/due soon/on track.
- Inspection drawer desktop / bottom sheet mobile.
- Force sync Midtrans.
- Salin spes produksi.
- Buka Drive.
- Target 48px.
- Table tidak overflow.

### 5.8 Download
- APK v1.0.3.
- `.exe` dan `.msi`.
- Panduan pasang PWA.
- Status rilis jelas.
- Tombol 48px.

## 6. Rencana komponen

### 6.1 Layout
- Satu `main`.
- Topbar safe area.
- Bottom nav safe area.
- Skip link.
- Page fade.
- Scroll progress.

### 6.2 Dialog/sheet
- MobileSheet sebagai primitive utama.
- Focus trap.
- Restore focus.
- Escape.
- Android back.
- Body scroll lock.
- Initial focus selector.
- Description ID.

### 6.3 Confirm
- ConfirmSheet reusable.
- Pending state.
- Error state.
- Initial focus.
- No native confirm.

### 6.4 Form
- Field 16px.
- Label jelas.
- Error role alert.
- Pending state.
- Disabled state.
- Validasi native.
- No iOS zoom.

### 6.5 Picker
- DateField modal.
- TimeField modal.
- Focus trap.
- Restore focus.
- Keyboard navigation.
- Mobile sheet.

### 6.6 Toast
- Live region permanen.
- Offline/online pasif.
- 48px action.
- Safe area.
- Auto hide online notice.

### 6.7 Camera
- Explicit tap.
- Permission after tap.
- Guide + example.
- Fallback gallery.
- Retry kamera.
- Track release.
- `ended` event.
- Live region status.

### 6.8 State view
- Empty state.
- Loading state.
- Error state.
- Retry.
- Compact variant.

## 7. Rencana aksesibilitas

- Semua halaman punya satu `main`.
- Semua dialog punya `aria-modal`.
- Semua icon button punya `aria-label`.
- Semua form error pakai `role="alert"`.
- Semua status pembayaran pakai live region.
- Semua menu mobile pakai disclosure.
- Semua picker pakai modal.
- Semua focus trap punya restore.
- Semua escape menutup overlay.
- Semua target 48px.
- Semua input 16px.
- Semua heading memiliki struktur.
- Semua link eksternal `rel="noreferrer"`.
- Semua gambar meaningful punya alt.

## 8. Rencana responsif

- 320px wajib lolos.
- 360px wajib lolos.
- 390px wajib lolos.
- 430px wajib lolos.
- Tablet landscape wajib lolos.
- Desktop wajib lolos.
- No horizontal overflow.
- No fixed width yang meledak.
- Grid min-width aman.
- Sheet max height 92dvh.
- Action bar tidak menutup konten.

## 9. Rencana performa

- Cache version bump setiap UI change.
- Service worker hanya aset publik.
- Admin/API tidak di-cache.
- Lazy load berat.
- Image optimization.
- No glow.
- No animasi berlebihan.
- Reduced motion.
- Lighthouse a11y 1.00 target.

## 10. Rencana offline

- Status offline pasif.
- Online notice 3 detik.
- Service worker controller.
- No nag.
- Retry manual.
- Cache shell.
- Form tidak hilang saat offline.

## 11. Rencana install PWA

- Pasif only.
- Tanpa auto-modal.
- Tidak mount di app terinstal.
- Penolakan 30 hari.
- “Nanti” 7 hari.
- Install button header/menu.
- Panduan pasang.
- Download APK/Windows.

## 12. Rencana kamera

- Tap eksplisit.
- Permission setelah tap.
- Guide + contoh.
- Fallback gallery.
- Retry kamera.
- Track release.
- `ended` event.
- Live region status.
- No auto-open.

## 13. Rencana admin

- KPI SLA 6 jam.
- Urutan deadline.
- Status overdue/due soon/on track.
- Inspection drawer/sheet.
- Force sync.
- Salin spes produksi.
- Buka Drive.
- Audit trail.
- Target 48px.

## 14. Rencana monetisasi pasif

- Konversi DB existing.
- Tanpa order palsu.
- Tanpa pembayaran palsu.
- Tanpa ulasan palsu.
- Tanpa manipulasi Midtrans.
- Hanya UI/UX.

## 15. Rencana QA

### Otomatis
- `npx tsc --noEmit --incremental false`
- `npm run build`
- `npm run test:smoke`

### Browser
- Lighthouse a11y.
- Console error 0.
- Overflow 0.
- Main landmark 1.
- Target 48px.
- Input 16px.
- Safe area.
- Offline/online.
- Install flow.
- Kamera fallback.

### Produksi
- Cache-bust `?v=<sha>`.
- `sw.js` version.
- `/download`.
- Admin login.
- Smoke 12/12.

### Fisik
- Android back.
- Notch.
- Kamera.
- PWA install.
- Windows installer.

## 16. Definition of Done

Sebuah pass dianggap selesai bila:

- tsc lulus,
- build lulus,
- smoke lulus,
- Lighthouse a11y 1.00 pada halaman utama,
- overflow 0,
- console error 0,
- sw version dinaikkan,
- commit/push berhasil,
- Vercel success,
- docs diperbarui.

## 17. Milestone

### Milestone 1 — Fondasi
- main landmark,
- target 48px,
- input 16px,
- safe area,
- overflow clip.

### Milestone 2 — Dialog dan fokus
- MobileSheet,
- ConfirmSheet,
- DateField,
- TimeField,
- MobileNav,
- PWA.

### Milestone 3 — Status dan pembayaran
- PaymentPoller,
- live region,
- offline/online,
- camera.

### Milestone 4 — Admin
- KPI SLA,
- inspection,
- force sync,
- target 48px.

### Milestone 5 — Final polish
- small text,
- shadows,
- empty/loading/error,
- nota,
- download.

## 18. Risiko

- Perubahan UI bisa mempengaruhi layout admin.
- Cache lama bisa menyembunyikan perubahan.
- Wrapper APK bisa menyimpan UI lama.
- Kamera butuh perangkat nyata.
- Admin login DB belum diverifikasi.
- Sertifikat code signing belum tersedia.

## 19. Langkah berikutnya

1. Bangun batch UI-only berikutnya berdasarkan milestone 5.
2. Tambahkan empty/loading/error state yang belum konsisten.
3. Normalisasi sisa teks kecil.
4. Uji fisik Android.
5. Verifikasi login admin DB.
6. Update docs dan cache.

## 20. Status

- Rencana: **selesai**
- Siap build: **ya**
- Build fase berikutnya: **menunggu eksekusi**
