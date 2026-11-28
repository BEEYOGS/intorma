# in.torma — self-service desain & cetak

Platform self-service untuk memesan jasa desain dan cetak: katalog dan kalkulasi harga,
order dengan deadline tanggal **dan jam**, pembayaran (transfer/Midtrans), lacak status,
portal pelanggan, nota PDF, PWA, serta installer native (Windows/Android).

Stack: Next.js 15 (App Router) + Tailwind CSS 3 + Neon Postgres. WhatsApp produksi memakai
**Fonnte**; OpenWA/Meta Cloud adalah opsi. Antarmuka memakai tema gelap monokrom dengan aksen
biru `#0070f3`; hijau tidak dipakai, merah hanya untuk kondisi berbahaya. Logo resmi
mempertahankan warna aslinya. Detail visual ada di `DESIGN.md`; font di-host lokal lewat
`next/font/local`.

> URL produksi yang aktif: **https://intorma-psi.vercel.app**. Domain `torma-psi.vercel.app`
> (tanpa `in`) bukan alias deployment ini dan akan menampilkan 404 Vercel sampai alias/dns
> diperbaiki di pengaturan project Vercel.

Halaman utama: `/` · order: `/order` · lacak: `/lacak` · portal: `/masuk`
· admin: `/admin/login` · unduh aplikasi: `/download`.

## Run

1. `npm install` (Node ≥ 20.12).
2. Salin `.env.example` ke `.env.local`, lalu isi nilainya (jangan commit file env).
3. `npm run db:migrate` — membuat tabel, kolom baru, `wa_outbox`, dan seed layanan.
4. `npm run db:catalog:all` — menyamakan harga/kategori katalog dengan `scripts/seed-catalog.mjs`.
5. `npm run dev` → http://localhost:3000 (atau port yang ditampilkan Next).

Pemeriksaan tanpa mengirim pesan: `npm run typecheck`, `npm run build`, dan
`npm run test:smoke` (bisa diarahkan ke URL lain dengan `BASE_URL=https://… npm run test:smoke`).
Smoke hanya membaca endpoint dan tidak mengirim WA/email.

### Bootstrap admin database

`ADMIN_PASSWORD_ENABLED=0` adalah pengaturan produksi. Untuk menyiapkan akun admin pertama
pada database baru, lakukan **sekali** di mesin lokal yang DATABASE_URL-nya bukan produksi:

```bash
# isi ADMIN_PASSWORD sementara di .env.local lokal
npm run db:admin-owner
# verifikasi login di /admin/login, lalu kosongkan ADMIN_PASSWORD
```

Setelah akun database aktif, set `ADMIN_PASSWORD_ENABLED=0` lagi. Jangan mengaktifkan fallback
password di Vercel hanya untuk "masuk dulu".

## Self-service order

Halaman pelanggan:

- `/masuk` — daftar atau masuk ke portal klien.
- `/portal` — dashboard pesanan, status, pembayaran, profil, dan pesan ulang.
- `/portal/files` — “File Saya”: daftar file yang diunggah, download original (tanpa kompresi),
  dan download beberapa file sekaligus sebagai ZIP tanpa kompresi (`/api/files/zip`).

Saat akun dibuat (atau saat masuk), pesanan lama dengan nomor WhatsApp yang sama otomatis
terhubung ke akun tersebut. Form `/order` juga mengisi nama & WhatsApp dari akun yang sedang masuk.

Jalankan sekali saat menyiapkan database:

```bash
npm run db:migrate         # tabel + kolom baru (additive, aman untuk data lama)
npm run db:catalog:all     # metadata + harga produk, lalu katalog opsi (idempoten)
npm run db:wa-trigger      # pengaman notifikasi WhatsApp untuk order baru
```

`db:catalog:all` menjalankan `db:catalog` (nama, deskripsi, kategori, dan harga dasar dari
`scripts/seed-catalog.mjs`) lalu `db:self-service` (grup opsi bahan/ukuran/finishing).
Harga dasar mengacu pada riset pasar Indonesia 2026: logo basic Rp250.000, spanduk
Rp25.000/m², poster A3+ Rp5.000/lembar, kartu nama Rp30.000/box, stiker vinyl A3+
Rp10.000/lembar, dan kaos sablon DTF Rp65.000/pcs. Angka bisa diubah admin per layanan.

Halaman yang dipakai pelanggan:

- `/katalog` — semua produk dengan ilustrasi monokrom unik per layanan (SVG, bukan foto).
- `/kalkulator` — hitung bleed, area aman, resolusi, rasio, ukuran pixel, dan estimasi ukuran file.
- `/order` — pilih layanan, atur bahan/ukuran/finishing/jumlah, lihat total, lalu kirim pesanan.
- `/lacak` dan `/lacak/INT-DDMMYY001` — cek status, rincian harga, dan instruksi transfer.

Tampilan memakai tema gelap bertingkat obsidian → panel → garis tipis. Aksen bidang dan tombol
memakai biru `#0070f3`; teks kecil memakai turunannya `#3291ff` agar kontrasnya lolos audit.
Teks status di nota/PDF memakai `printColor` supaya tetap terbaca di atas kertas putih.

Satu fungsi perhitungan dipakai form dan server action (`src/lib/pricing.ts`), sehingga angka di
layar sama dengan tagihan yang tersimpan. Model harganya:

- `flat` — paket desain: harga dasar + paket/tambahan sekali bayar.
- `per_unit` — poster, kartu nama, stiker: harga satuan × jumlah + opsi per item.
- `area` — spanduk: lebar × tinggi cm ÷ 10.000, luas minimum `min_area_m2`, pembulatan
  `round_to`, ditambah opsi per m².

Kolom lama `services.pricing_mode` sengaja tidak diubah agar aplikasi yang sudah live tetap jalan;
model baru ada di `services.pricing_model`. Rincian pesanan disimpan sebagai snapshot di
`orders.options`, jadi pesanan lama tetap menampilkan harga yang saat itu disepakati.

Halaman `/kalkulator` memakai perhitungan sisi klien yang sama dengan panduan produksi: ukuran jadi
ditambah bleed di semua sisi, area aman dipotong dari ukuran jadi, lalu pixel dihitung dari
`cm ÷ 2,54 × dpi`. Preset kartu, A4/A3, stiker, spanduk, dan kaos bisa diubah; hasilnya mencakup
rasio, luas per lembar, total luas untuk sejumlah cetakan, estimasi TIFF/PDF, dan pemeriksaan
mode warna serta resolusi minimum. Tombol “Salin spesifikasi” memudahkan pelanggan mengirim
spesifikasi ke admin sebelum order dibuat.

Untuk produk cetak, pelanggan bisa **upload langsung** atau menempel link Google Drive/WeTransfer.
Google Drive wajib aktif untuk tombol upload: file tidak pernah disimpan di database ataupun
melewati Vercel. Browser membuat sesi Google Drive Resumable Upload lalu mengirim chunk 8 MB
langsung ke Google, dengan progress bar, retry otomatis 3×, dan nama file
`[KODE]_[NamaPelanggan]_[NamaAsli]`. Neon hanya menyimpan metadata di tabel `uploads`.
Batas praktisnya mengikuti Google Drive (5 TB per file), bukan batas serverless.
Unduh ZIP maksimal 200 MB total agar tidak menghabiskan memory serverless.

### Penyimpanan file di Google Drive (wajib untuk upload)

Untuk memakai kuota Google Drive pribadi:

1. Buat project di Google Cloud Console dengan akun Google pemilik folder.
2. Aktifkan **Google Drive API**.
3. Buat **OAuth client ID** (Web application). Untuk getting refresh token, cara termudah:
   buka Google OAuth 2.0 Playground, centang “Use your own OAuth credentials”, isi client ID/secret,
   pilih scope `https://www.googleapis.com/auth/drive.file`, authorization & exchange, lalu salin
   `refresh_token`.
4. Di Google Drive, buat folder (mis. `intorma-uploads`) dengan akun Google yang sama. Salin folder
   ID dari URL folder.
5. Isi environment: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, dan
   `GOOGLE_DRIVE_FOLDER_ID`.

Catatan: **service account tidak bisa dipakai untuk "My Drive" pribadi** (Google mengembalikan 403
“Service Accounts do not have storage quota”). Service account hanya didukung untuk Shared Drive/
Workspace dengan `GOOGLE_DRIVE_AUTH=service_account`.

Dengan Drive aktif:
- `POST /api/drive/init-upload` membuat sesi resumable (hanya metadata kecil).
- Browser `PUT` chunk langsung ke Google, jadi file 1 GB+ tidak terkena limit 4,5 MB Vercel.
- `POST /api/drive/finalize-upload` memverifikasi file benar-benar ada di folder yang dikonfigurasi,
  lalu mencatat `drive_file_id` dan ukuran di tabel `uploads`.
- Preview/download memakai `/api/upload/<kode>` yang meneruskan stream + Range dari Drive.
- ZIP tetap tanpa kompresi, mengambil file dari Drive, dan dibatasi 200 MB total.

### Aplikasi native & PWA

Halaman `/download` mengarah ke aset rilis GitHub yang dibangun oleh
`.github/workflows/build-native.yml` (`.exe`, `.msi`, `.apk`). PWA dipasang lewat
`manifest.webmanifest` + `sw.js` (cache `intorma-v9`). Tombol **Install aplikasi** di header/menu
hanya muncul setelah pengguna mengetuknya; tidak ada auto-modal. Penolakan disimpan 30 hari dan
“Nanti” 7 hari di localStorage.

**Status rilis saat ini:** installer Windows v1.0.2 sudah nyata tetapi **belum di-code-sign**
(SmartScreen masih bisa muncul). APK v1.0.2 juga nyata tetapi masih `app-debug.apk`, sehingga
`debuggable` dan memakai debug key. Workflow sudah disiapkan untuk menghasilkan `.apk` release
signed pada tag berikutnya bila secret keystore diisi; sampai saat itu, anggap APK sebagai build
sideload, bukan artifact Play Store.

Tauri dan Capacitor adalah **wrapper online** ke `https://intorma-psi.vercel.app`, bukan static
export Next.js (SSR/API/server action tidak bisa diekspor ke `public`). Konsekuensinya:

- Butuh koneksi untuk first load; halaman offline PWA tidak membantu saat aplikasi native pertama
  kali dibuka tanpa jaringan.
- `npm run tauri dev` memakai `http://localhost:3000` (`beforeDevCommand: npm run dev`), sedangkan
  installer memuat URL produksi dengan `?source=installed_app`.
- Build Tauri lokal memerlukan MSVC Build Tools + Windows SDK + WebView2; build APK lokal memerlukan
  Android SDK (`ANDROID_HOME`/`ANDROID_SDK_ROOT`). Tanpa itu, pakai artifact CI.
- Deteksi app terinstal mencakup PWA standalone, WebView/TWA, Capacitor native, dan Tauri, sehingga
  tombol install PWA tidak di-mount di dalam aplikasi native.

### Bottom bar mobile

Pedoman yang dipakai: `viewport-fit=cover` + `env(safe-area-inset-bottom)` agar bar tidak tertutup
home indicator (MDN `env()`), `100dvh` untuk tinggi layar dinamis (MDN viewport units), target
sentuh minimal 24×24 CSS px dan disarankan 44×44 (WCAG 2.2 SC 2.5.8), serta maksimal lima
destination pada navigation bar (Material 3 / HIG tab bar).

Semua ukuran ada di `src/app/globals.css`:

- `--bottom-bar-height: 56px` — tinggi area tombol, di atas batas 44px.
- `--bottom-bar-safe` — tinggi tombol + safe area perangkat.
- `--bottom-bar-clearance` — jarak konten di atas bar; jadi `0` di desktop dan di halaman yang
  menyembunyikan nav global.
- `--bottom-overlay-offset` — offset toast/kartu install; tetap memakai ruang bar mesmo nav disembunyikan
  karena `/order` punya action bar sendiri.

`StorefrontBottomNav` tidak di-mount pada halaman dengan action bar sendiri (`/order`) maupun alur
privat/transaksional (`/admin`, `/bayar`, `/nota`, `/portal`, `/masuk`, `/dashboard`, detail `/lacak`).
Admin memakai lima destination + tombol **Lainnya** berupa bottom sheet; enam tab sisanya tidak
dipaksakan berbagi lebar 360px. `AdminBottomNav` menutup sheet saat rute berubah, Escape, atau
ketukan di luar, dan mengembalikan fokus ke tombol pembuka.

### Interaksi mobile lanjutan

- `MobileSheet` dipakai bersama `OrderInspection` dan menu **Lainnya** admin: geser ke bawah untuk
  menutup (jarak >104px atau velocity >0,45px/ms), focus trap, kunci scroll, Escape, backdrop, dan
  pengembalian fokus. Di desktop tetap berupa drawer kanan tanpa gesture.
- Tombol back Android mengikuti urutan: tutup overlay teratas → `history.back()` untuk navigasi
  internal → keluar aplikasi. Sheet, date/time picker, pratinjau file, command palette, menu seluler,
  dan kartu install mendaftar ke tumpukan overlay global (`src/lib/overlay-stack.ts`).
- Katalog punya bar filter ringkas yang muncul setelah kartu filter terlewat, otomatis menyusut saat
  scroll turun, dan memakai chip kategori horizontal `scroll-snap`. Filter anggaran ikut tersinkron
  ke URL.
- Toast dibatasi tiga item, bisa digeser horizontal atau ditutup dengan tombol, dan memakai satu
  region `aria-live` di container.
- Haptic opsional lewat `navigator.vibrate` saat salin, install diterima, atau validasi gagal.
  Matikan dengan `localStorage.setItem("intorma-haptics", "0")`; otomatis mati bila
  `prefers-reduced-motion: reduce` aktif.
- Halaman `/bayar` punya action bar bawah sendiri (Cek status / Lihat nota) karena nav global sengaja
  disembunyikan di alur transaksional.

### WhatsApp

**Jalur aktif: Fonnte.** Nomor WhatsApp yang sama tetap dipakai tanpa menghapus chat atau
memindahkan nomor. Token dan URL webhook bersifat rahasia; jangan pernah ditempel di chat.

```env
WA_PROVIDER=fonnte
FONNTE_TOKEN=token-dari-dashboard-fonnte
OPENWA_WEBHOOK_SECRET=string-acak-panjang
ADMIN_WHATSAPP_NUMBER=nomor-admin-kamu
```

Langkah Fonnte:

1. Pastikan device di dashboard Fonnte berstatus **connect** dan kuota masih ada.
2. Isi `FONNTE_TOKEN` di `.env.local` (atau Environment Variables Vercel). `npm run wa:fonnte:setup`
   adalah **opsional** dan akan menimpa Environment Variables produksi di Vercel, bukan hanya `.env.local`.
3. Di dashboard Fonnte → Device → Edit, set Webhook URL ke
   `https://intorma-psi.vercel.app/api/wa/webhook/<WA_WEBHOOK_SECRET>` dan aktifkan **auto read**.
   `WA_WEBHOOK_SECRET` jatuh ke `OPENWA_WEBHOOK_SECRET` bila kosong. Secret hanya lewat segmen path,
   bukan query string. Jangan menempelkan URL lengkap di chat.
4. Deploy ulang: `npx --no-install vercel --prod --yes`.
5. Paket Fonnte tertentu masih menambahkan footer pihak ketiga yang tidak bisa dihapus lewat API.
   Pastikan paket yang dipakai mendukung pesan tanpa footer sebelum dipakai produksi.

Meta WhatsApp Cloud API tetap tersedia sebagai alternatif tanpa gateway pihak ketiga, tetapi
menunggu verifikasi nomor dan persetujuan template:

```env
WA_PROVIDER=cloud
META_WA_TOKEN=system-user-token-dari-meta
META_WA_PHONE_ID=phone-number-id-dari-meta
META_WA_VERSION=v25.0
META_WA_VERIFY_TOKEN=string-acak-untuk-verifikasi-webhook
META_WA_APP_SECRET=app-secret-untuk-tanda-tangan-webhook
META_TPL_LANGUAGE=id
ADMIN_WHATSAPP_NUMBER=nomor-admin-kamu
```

Langkah Meta:

1. Buat Meta App dengan use case WhatsApp, lalu daftarkan nomor bisnis (bukan nomor pribadi).
2. Pakai **system user token** permanen, bukan token sementara dari App Dashboard.
3. Daftarkan webhook `https://intorma-psi.vercel.app/api/wa/webhook` dengan verify token yang sama
   dengan `META_WA_VERIFY_TOKEN`, lalu subscribe field `messages`.
4. Buat dan ajukan enam template body berikut. Nama default bisa diganti lewat env
   `META_TPL_ORDER`, `META_TPL_ADMIN`, `META_TPL_STATUS`, `META_TPL_PAYMENT`,
   `META_TPL_REMINDER`, `META_TPL_REORDER`.

| Nama template | Isi body |
| --- | --- |
| `order_created` | `Halo {{1}}, pesanan {{2}} sudah kami terima. {{3}} Total: {{4}} Target selesai: {{5}} Pantau & bayar: {{6}}` |
| `admin_notice` | `Notifikasi in.torma — {{1}}: {{2}}` |
| `order_status` | `Halo {{1}}, pesanan {{2}}: {{3}} Pantau di: {{4}}` |
| `payment_received` | `Halo {{1}}, pembayaran {{2}} sebesar {{3}} sudah kami terima. Terima kasih! Pantau: {{4}}` |
| `payment_reminder` | `Halo {{1}}, pesanan {{2}} masih menunggu pembayaran. Total: {{3}} Target selesai: {{4}} Bayar & detail: {{5}}` |
| `reorder_offer` | `Halo {{1}}, pesanan {{2}} sudah selesai. Butuh cetak ulang? Pakai {{3}} untuk diskon. Pesan lagi: {{4}}` |

Setelah `META_WA_TOKEN` dan `META_WA_PHONE_ID` terisi, jalankan `npm run wa:cloud:templates`
untuk membuat keenam template lewat Graph API. Template yang baru dibuat tetap perlu disetujui Meta.

Balasan `status INT-DDMMYY001` memakai teks biasa karena terjadi dalam jendela 24 jam setelah
pelanggan membalas. Notifikasi keluar memakai template agar tidak ditolak dengan kode `131047`.
Nomor pengirim berubah dari nomor lama, jadi beri tahu pelanggan.

Saat pindah ke Cloud, matikan trigger database agar tidak ada pesan yang mengendap di `wa_outbox`:

```sql
update app_settings set value = '0' where key = 'wa_trigger_enabled';
```

Fallback OpenWA (self-hosted) tetap didukung:

```env
WA_PROVIDER=openwa
OPENWA_BASE_URL=https://gateway-publik-stabil.example.com
OPENWA_API_KEY=...
OPENWA_SESSION=intorma
OPENWA_WEBHOOK_SECRET=string-acak-panjang
```

`OPENWA_BASE_URL` produksi **tidak boleh** memakai `127.0.0.1` atau quick tunnel
`trycloudflare.com`. Kalau gateway tidak bisa dijangkau dari Vercel, pesan masuk `wa_outbox` dan
dikirim oleh `npm run wa:agent`. Alias lama `OPENWA_URL`, `OPENWA_KEY`, dan `ADMIN_WA` masih dibaca.

Kalau tidak memakai OpenWA (Fonnte atau Cloud), nonaktifkan task lokal agar PC tidak menjalankan gateway lama:

```powershell
Disable-ScheduledTask -TaskName intorma-openwa
Disable-ScheduledTask -TaskName intorma-wa-agent
```

### Diagnostik & tes

- `GET /api/wa/test-gateway` — status konfigurasi, gateway, sesi, dan latency (butuh login admin
  atau header `x-admin-secret`).
- `POST /api/wa/test-gateway` — kirim pesan tes **nyata**; body opsional `{ "phone": "...", "message": "..." }`.
- `npm run test:integrations` — tes OAuth Drive (resumable upload + hapus file uji) dan tes kirim WA
  ke nomor admin. Kalau kredensial belum diisi, bagian tersebut dilaporkan `SKIP`.

> **PERINGATAN:** `POST /api/wa/test-gateway`, `npm run test:integrations`, dan
> `npm run wa:fonnte:setup` / `npm run wa:cloud:setup` dapat mengirim WhatsApp nyata, mengubah
> webhook produksi, atau menimpa **Environment Variables di Vercel** (bukan sekadar `.env.local`).
> Jalankan hanya bila dimaksudkan, pastikan akun Vercel yang aktif benar, dan jangan pakai nomor
> pelanggan untuk uji coba. `npm run wa:check`, `npm run typecheck`, `npm run build`, dan
> `npm run test:smoke` hanya membaca status dan aman dipakai kapan saja.

> **Script yang mengubah data:** `npm run db:migrate`, `npm run db:catalog:all`, `npm run db:wa-trigger`,
> `npm run db:admin-owner`, `npm run db:uploads-to-drive`, `npm run db:drive-only`, dan `npm run db:backup`
> menulis ke database yang ditunjuk `.env.local`. Sebelum menjalankan terhadap produksi, cek
> `DATABASE_URL`, ambil backup, dan pastikan skrip memang dimaksudkan. `db:drive-only` menghapus
> kolom lama `uploads.data` dan bersifat destruktif.

### Pembayaran

Dua jalur bisa dipakai berdampingan:

- **Transfer manual** (default): atur rekening di `/admin/pengaturan`. Admin mencentang
  “Pembayaran sudah masuk” di `/admin` setelah mengecek bukti transfer.
- **Midtrans Core API** (opsional): isi `MIDTRANS_SERVER_KEY` di environment. Tombol
  “Pilih metode pembayaran” di halaman lacak membuka `/bayar/[kode]`, lalu pelanggan memilih
  **QRIS** atau **Virtual Account** (BCA/BNI/BRI/Permata) tanpa popup Snap. Tagihan disimpan di
  tabel `payments`, QR dibuat lokal dari `qr_string`, dan halaman memantau status lewat
  `/api/payment/status`. Webhook `/api/payment/webhook` menandai pesanan lunas otomatis setelah
  status `settlement`/`capture`. Set `MIDTRANS_IS_PRODUCTION=1` setelah pindah ke akun produksi,
  aktifkan QRIS + VA di dashboard Midtrans, lalu daftarkan URL webhook tersebut.
- **Deadline**: form pesanan mewajibkan tanggal dan jam. Nilai lengkap disimpan di
  `orders.deadline_at` (WIB → UTC), tampil di lacak/nota/PDF, dan dipakai cron pengingat.
  Kolom lama `orders.deadline` (tanggal saja) tetap dibaca sebagai fallback.

Logo QRIS dan bank (BCA/BNI/BRI/Permata) disimpan lokal di `public/logos` dari Wikimedia Commons;
sumber dan lisensinya ada di `public/logos/CREDITS.md`.

Tanpa server key, alur tetap memakai transfer manual seperti sebelumnya.

### Kelola opsi dari admin

Buka `/admin/layanan`, lalu buka layanan yang ingin diatur. Di bawah form harga ada bagian
**Opsi & finishing** untuk menambah grup (bahan, ukuran, finishing, paket) dan nilainya—termasuk
harga tambahan, basis hitung (per item/per m² atau sekali pesanan), opsi default, dan status aktif.
Perubahan langsung dipakai halaman `/order` tanpa menjalankan SQL manual.

### Alur kerja admin

- **Triage cepat**: buka pesanan, lalu pakai tombol **Aksi cepat** untuk lanjut status atau
  tandai lunas sekali ketuk. Aksi ini sengaja tidak mengirim WhatsApp supaya kuota tidak boros.
  Untuk mengabari klien, pakai editor penuh dan centang “Kabari klien lewat WhatsApp”.
- **Catatan internal** pada editor penuh hanya terlihat admin dan tidak pernah masuk pesan WA.
- **Bukti transfer**: kolom link bukti pada editor penuh tersimpan di `payments.proof_url`.
  Kosongkan untuk menghapus tautan lama.
- **Piutang**: kartu “Piutang menunggu transfer” di `/admin` memecah nominal berdasarkan umur
  (<3 hari, 3–7 hari, >7 hari). Klik untuk membuka filter `?p=belum`.
- **Fokus hari ini**: panel di atas daftar pesanan menampilkan konfirmasi harga, deadline ≤48 jam,
  telat bayar >2 hari, dan revisi. Semuanya bisa diklik menjadi filter (`?p=deadline`, `?p=aging`).
- **Aksi massal**: bisa mengubah status sekaligus memilih **lunas / belum dibayar / tidak diubah**.
  Sinkronisasi `payment_status`, `paid_at`, tabel `payments`, dan `order_events` ikut berjalan.
- **CRM**: `/admin/pelanggan` mengelompokkan pesanan per nomor WhatsApp lengkap dengan total
  belanja, piutang, riwayat pesanan, dan tombol chat langsung.
- **Pengingat**: cron harian pukul 09.00 WIB mengirim pengingat deadline H-2 (maksimal sekali per
  pesanan per hari, kunci `reminder-<kode>-<tanggal>`) dan tagihan belum dibayar pada hari ke-2, 7,
  dan 14 (kunci `unpaid-<kode>-<stage>`). Rangkuman admin dikirim sekali sehari dengan kunci
  `admin-digest-<tanggal>`.
- **Keamanan cron**: endpoint `/api/cron/reminders` menolak panggilan tanpa
  `Authorization: Bearer <CRON_SECRET>` di production. `CRON_SECRET` wajib diisi di Vercel.
- **Pesan klien**: balasan yang bukan perintah `status` diteruskan ke WhatsApp admin, maksimal sekali
  per nomor per hari (`inbound-<nomor>-<tanggal>`) supaya kuota tetap hemat.
- **Pengaturan notifikasi**: `/admin/pengaturan` punya dua sakelar terpisah untuk pengingat klien dan
  rangkuman admin.

Kolom `orders.internal_note` ditambahkan lewat `npm run db:migrate` (idempoten).

### Antrean WA outbox & agent

Ada tiga fungsi WhatsApp yang berbeda:

1. **Tautan chat publik** (`wa.me` / WhatsApp Web) — selalu bekerja, tidak butuh gateway.
2. **Notifikasi keluar** — produksi memakai Fonnte. Jika pengiriman langsung gagal (atau
   `WA_QUEUE_ONLY=1`), pesan masuk `wa_outbox` apa pun provider aktifnya.
3. **Balasan otomatis masuk** (`status INT-DDMMYY001`) — lewat webhook ke `/api/wa/webhook`.

Worker `npm run wa:agent` saat ini hanya bisa menguras antrean melalui gateway **OpenWA**. Jika
Fonnte/Cloud gagal dan antrean terisi, pesan akan menunggu sampai OpenWA fallback disiapkan atau
drain Fonnte ditambahkan. Pantau `wa_outbox` lewat `/admin` atau `npm run wa:check`.

Karena **Vercel tidak bisa menjangkau OpenWA di `localhost`**, notifikasi dari deployment Vercel
disimpan di tabel `wa_outbox`. Worker `npm run wa:agent` mengambilnya lewat jembatan publik
`GET/POST /api/wa/outbox` memakai header `x-webhook-secret` (bukan query `?s=`) dan tetap
membutuhkan `OPENWA_URL`/`OPENWA_KEY` untuk mengirim ke gateway. Yang **tidak** diperlukan adalah
`DATABASE_URL` produksi di PC. Jika `DATABASE_URL` tersedia, agent bisa membaca antrean langsung
dari Neon dan menyediakan inbox webhook lokal di port `WA_INBOX_PORT`.

SOP OpenWA + worker:

1. Jalankan gateway OpenWA dan isi `.env.local`: `OPENWA_URL`, `OPENWA_KEY`, `OPENWA_SESSION`,
   `OPENWA_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL` (atau `SITE_WEBHOOK_URL`).
2. Tautkan sesi WhatsApp (scan QR):

   ```bash
   npm run wa:session
   ```

   Buka `.tools/qr-<sesi>.html` (auto-refresh), lalu scan dari WhatsApp → Perangkat tertaut.
3. Jalankan worker antrean di komputer yang menjalankan OpenWA:

   ```bash
   npm run wa:agent
   ```

4. Daftarkan webhook ke URL publik agar balasan `status INT-DDMMYY001` masuk ke situs produksi:

   ```bash
   SITE_WEBHOOK_URL=https://intorma-psi.vercel.app npm run wa:webhook
   ```

   Webhook memakai header `x-webhook-secret` / HMAC; **secret tidak boleh dikirim lewat query
   string**. `WA_WEBHOOK_URL` bisa dipakai untuk mengarahkan ke inbox lokal saat debugging.
   Pastikan secret di mesin itu **sama** dengan environment Vercel (jangan pernah menampilkannya).
5. Cek kondisi (tanpa mengirim pesan):

   ```bash
   npm run wa:check
   ```

### Mode lokal/gateway terpadu

Jika Next.js dan OpenWA berjalan di mesin yang sama, `npm run gateway` menjalankan
tunnel/app/gateway/webhook lokal sekaligus worker antrean (lihat `scripts/gateway.mjs`).
Sesuaikan path OpenWA di `scripts/openwa.mjs` bila perlu.

### Catatan penting

- Nomor admin (`ADMIN_WHATSAPP_NUMBER`, alias lama `ADMIN_WA`) sebaiknya **bukan** nomor akun
  WhatsApp gateway, supaya uji perintah status tidak bentrok dengan pesan `fromMe`.
- Pesan WA bersifat *best effort*: jika gateway/worker belum siap, order tetap tersimpan dan
  notifikasi tertunda di antrean.
- Untuk produksi stabil dengan OpenWA, jalankan `wa:agent` di VPS/komputer yang selalu hidup.
- Jangan jalankan `wa:agent` / `wa:webhook` / `wa:fonnte:setup` hanya untuk "coba-coba": skrip
  tersebut dapat mengirim WA nyata atau menimpa konfigurasi/env.

## Environment

| Variabel | Status | Arti |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Connection string Neon (pakai yang pooled) |
| `ADMIN_PASSWORD_ENABLED` | Wajib | `0` — fallback `ADMIN_PASSWORD` dinonaktifkan |
| `ADMIN_PASSWORD` | Nonaktif | Jangan dijadikan jalur masuk saat `ADMIN_PASSWORD_ENABLED=0` |
| `ADMIN_SECRET` | Wajib | Kunci acak panjang untuk tanda tangan cookie sesi |
| `CUSTOMER_SECRET`, `UPLOAD_TOKEN_SECRET` | Opsional | Kunci khusus sesi portal / token upload |
| `CRON_SECRET` | Wajib di production | Bearer token untuk `/api/cron/reminders` |
| `NEXT_PUBLIC_SITE_URL` | Disarankan | URL publik situs (link di pesan WA/webhook) |
| `NEXT_PUBLIC_WA_NUMBER` | Disarankan | Nomor WhatsApp publik untuk tombol chat |
| `ADMIN_WHATSAPP_NUMBER` (`ADMIN_WA`) | Opsional | Nomor penerima notifikasi pesanan baru |
| `WA_PROVIDER` | Aktif | `fonnte` (default produksi); `cloud` atau `openwa` sebagai opsi |
| `FONNTE_TOKEN` | Aktif | Token dashboard Fonnte (rahasia) |
| `WA_WEBHOOK_SECRET` | Aktif | Rahasia webhook Fonnte di path `/api/wa/webhook/<secret>`; jatuh ke `OPENWA_WEBHOOK_SECRET` |
| `META_WA_*`, `META_TPL_*` | Opsi | Hanya bila `WA_PROVIDER=cloud` (token, phone id, verify/app secret, template) |
| `OPENWA_BASE_URL` (`OPENWA_URL`) | Opsi | URL gateway OpenWA; jangan `localhost` di Vercel |
| `OPENWA_API_KEY` (`OPENWA_KEY`) | Opsi | API key gateway (`x-api-key`) |
| `OPENWA_SESSION` | Opsi | Nama sesi WhatsApp, default `intorma` |
| `OPENWA_WEBHOOK_SECRET` | Opsi | Rahasia webhook OpenWA **dan** jembatan `/api/wa/outbox` (bukan query webhook) |
| `SITE_WEBHOOK_URL` (`OUTBOX_URL`, `WA_SITE_URL`) | Opsi | URL situs publik untuk agent tanpa DB produksi |
| `WA_WEBHOOK_URL` | Opsi | Timpa URL webhook yang didaftarkan ke OpenWA |
| `WA_QUEUE_ONLY` | Opsi | `1` untuk memaksa antrean, tidak kirim langsung |
| `WA_POLL_MS` | Opsi | Interval polling worker (ms), default 5000 |
| `WA_INBOX_PORT`, `WA_INBOX_SECRET`, `WA_OPEN_QR` | Opsi | Inbox balasan lokal & viewer QR |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_DRIVE_FOLDER_ID` | Wajib untuk upload | OAuth user Google Drive |
| `GOOGLE_DRIVE_AUTH`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GDRIVE_SERVICE_ACCOUNT`, `GDRIVE_FOLDER` | Opsi | Hanya Shared Drive / Workspace |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_IS_PRODUCTION` | Opsi | Midtrans Core API (tanpa Snap) |
| `MIDTRANS_SIGNATURE_SECRET_KEY` | Opsi | Kunci tanda tangan webhook; kosong → pakai server key |
| `ALLOW_LOCAL_CRON` | Dev-only | `1` hanya di localhost untuk menguji cron tanpa `CRON_SECRET` |
| `APP_PORT`, `GATEWAY_VERBOSE` | Dev-only | Port dan verbositas `npm run gateway` |
| `OPENWA_DIR`, `OPENWA_DIST_MAIN`, `OPENWA_NODE`, `OPENWA_PORT` | Dev-only | Path gateway OpenWA lokal |

## Deploy ke Vercel

`vercel.json` sudah disiapkan. Langkah umum:

1. Hubungkan repo/project ke Vercel (`beeyogs-projects/in.torma`).
2. Isi Environment Variables (Production/Preview sesuai kebutuhan): `DATABASE_URL`,
   `ADMIN_SECRET`, `ADMIN_PASSWORD_ENABLED=0`, `CRON_SECRET`,
   `NEXT_PUBLIC_SITE_URL=https://intorma-psi.vercel.app`, `NEXT_PUBLIC_WA_NUMBER`,
   `ADMIN_WHATSAPP_NUMBER`, `WA_PROVIDER=fonnte`, `FONNTE_TOKEN`, `WA_WEBHOOK_SECRET`,
   variabel Drive/Midtrans (termasuk `MIDTRANS_SIGNATURE_SECRET_KEY` bila berbeda), dll.
   **Jangan** mengaktifkan fallback `ADMIN_PASSWORD`, dan **jangan** set
   `OPENWA_URL`/`OPENWA_BASE_URL` ke localhost di Vercel.
3. Jalankan sekali ke database produksi:

   ```bash
   npm run db:migrate
   npm run db:catalog:all
   ```

   Perintah tersebut menulis ke `DATABASE_URL` yang aktif di `.env.local`—pastikan bukan database
   lain. Setelah deploy, jalankan `npm run test:smoke` untuk memeriksa health, robots, sitemap,
   dan endpoint privat tanpa mengirim pesan.

4. Pastikan domain/alias Vercel mengarah ke deployment yang benar (`intorma-psi.vercel.app`).
5. Fonnte adalah jalur aktif: daftarkan webhook dengan secret di path (lihat bagian WhatsApp).
   Bila memakai fallback OpenWA, jalankan `npm run wa:agent` di mesin dengan OpenWA aktif dan
   daftarkan webhook publik (`npm run wa:webhook`). Jangan menjalankan skrip pengirim WA nyata
   hanya untuk verifikasi deploy.

## Struktur singkat

```text
db/schema.sql            tabel + wa_outbox + seed layanan (idempoten)
scripts/migrate.mjs      menjalankan schema.sql
scripts/gateway.mjs      tunnel + app + OpenWA + worker untuk mode lokal
scripts/wa-agent.mjs     worker antrean wa_outbox via jembatan publik / DB lokal
scripts/wa-session.mjs   buat/start sesi OpenWA + viewer QR
scripts/wa-webhook.mjs   daftar/update webhook OpenWA ke situs publik
scripts/wa-check.mjs     diagnosa provider/gateway/sesi/webhook/antrean
scripts/smoke.mjs        pemeriksaan endpoint aman (BASE_URL bisa diubah)
src/app/actions.ts       server action: order, login, admin CRUD, WA
src/app/api/db/migrate   eksekutor schema.sql (admin-only + rate limit)
src/app/api/wa/outbox    jembatan antrean untuk agent tanpa DB produksi
src/app/api/wa/webhook   balasan otomatis "status INT-XXXXXX" (Fonnte/Meta/OpenWA)
src/components           UI (Chrome, form order, editor admin, WhatsApp link)
src/lib                  db, auth, settings, format, status, pricing, wa, site, drive
```

> Jangan commit `.env.local` atau kredensial apa pun, dan jangan menempelkan token/secret di chat.
