# in.torma — self-service desain & cetak

Platform self-service untuk memesan jasa desain dan cetak: katalog dan kalkulasi harga,
order dengan deadline tanggal **dan jam**, pembayaran (transfer/Midtrans), lacak status,
portal pelanggan, nota PDF, PWA, serta installer native (Windows/Android).

Antarmuka memakai tema gelap monokrom dengan aksen biru `#0070f3`; hijau tidak dipakai,
merah hanya untuk kondisi berbahaya. Logo resmi mempertahankan warna aslinya.

Halaman utama: `/` · order: `/order` · lacak: `/lacak` · portal: `/masuk`
· admin: `/admin/login` · unduh aplikasi: `/download`.

## Run
```bash
npm install
npm run db:migrate
npm run dev
```
Set `.env.local` from `.env.example`.

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
`.github/workflows/build-native.yml` (`.exe`, `.msi`, `.apk` v1.0.2). PWA dipasang lewat
`manifest.webmanifest` + `sw.js` (cache `intorma-v9`). Tombol **Install aplikasi** di header/menu
membuka prompt PWA bila browser mendukung; jika tidak, popup menampilkan panduan per platform.
Penolakan popup disimpan per sesi agar tidak muncul berulang saat berpindah halaman.

Tauri adalah jalur wrapper utama. Konfigurasi Capacitor disimpan hanya sebagai percobaan Android;
keduanya memuat URL produksi yang sama, sehingga folder `public` bukan hasil static export Next.js
dan build lokal Tauri memerlukan Windows SDK. Jangan menganggap build lokal sebagai pengganti rilis CI.

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

### WhatsApp

**Jalur utama: Meta WhatsApp Cloud API.** Tidak butuh PC, gateway lokal, atau `wa-agent`; pesan
dikirim langsung dari Vercel. Adapter OpenWA tetap ada sebagai fallback self-hosted, dan Fonnte hanya
kompatibilitas lama (footernya tidak bisa dihapus lewat API).

```env
WA_PROVIDER=cloud
META_WA_TOKEN=system-user-token-dari-meta
META_WA_PHONE_ID=phone-number-id-dari-meta
META_WA_VERSION=v25.0
META_WA_VERIFY_TOKEN=string-acak-untuk-verifikasi-webhook
META_WA_APP_SECRET=app-secret-untuk-tanda-tangan-webhook
META_TPL_LANGUAGE=id
ADMIN_WHATSAPP_NUMBER=089617607952
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

Kalau sudah pindah ke Cloud, nonaktifkan task lokal agar PC tidak menjalankan gateway lama:

```powershell
Disable-ScheduledTask -TaskName intorma-openwa
Disable-ScheduledTask -TaskName intorma-wa-agent
```

Diagnostik & tes:

- `GET /api/wa/test-gateway` — status konfigurasi, gateway, sesi, dan latency (butuh login admin
  atau header `x-admin-secret`).
- `POST /api/wa/test-gateway` — kirim pesan tes nyata; body opsional `{ "phone": "...", "message": "..." }`.
- `npm run test:integrations` — tes OAuth Drive (resumable upload + hapus file uji) dan tes kirim WA
  ke nomor admin. Kalau kredensial belum diisi, bagian tersebut dilaporkan `SKIP`.

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
