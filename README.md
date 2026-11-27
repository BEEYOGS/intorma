# in.torma — modern SaaS

Work in progress. The current app is a **mini-admin + product portal** design:
- Public product snapshot: `/`
- Dashboard: `/dashboard`
- Admin login: `/admin/login`, admin area: `/admin`
- Contact: `/contact`

Palette: grayscale ramp (black → white) as the base, with red reserved for status and warnings. The in.torma logo keeps its original colors.

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
- `/order` — pilih layanan, atur bahan/ukuran/finishing/jumlah, lihat total, lalu kirim pesanan.
- `/lacak` dan `/lacak/INT-DDMMYY001` — cek status, rincian harga, dan instruksi transfer.

Tampilan memakai tema gelap bertingkat obsidian → panel → garis tipis. Aksen aksi/lunas adalah abu
perak, bukan hijau; amber, biru, cyan, violet, dan merah tetap dipakai sebagai penanda status yang
berbeda. Teks status di nota/PDF memakai `printColor` supaya tetap terbaca di atas kertas putih.

Satu fungsi perhitungan dipakai form dan server action (`src/lib/pricing.ts`), sehingga angka di
layar sama dengan tagihan yang tersimpan. Model harganya:

- `flat` — paket desain: harga dasar + paket/tambahan sekali bayar.
- `per_unit` — poster, kartu nama, stiker: harga satuan × jumlah + opsi per item.
- `area` — spanduk: lebar × tinggi cm ÷ 10.000, luas minimum `min_area_m2`, pembulatan
  `round_to`, ditambah opsi per m².

Kolom lama `services.pricing_mode` sengaja tidak diubah agar aplikasi yang sudah live tetap jalan;
model baru ada di `services.pricing_model`. Rincian pesanan disimpan sebagai snapshot di
`orders.options`, jadi pesanan lama tetap menampilkan harga yang saat itu disepakati.

Untuk produk cetak, pelanggan bisa **upload langsung** atau menempel link Google Drive/WeTransfer.
Tanpa Drive, file disimpan di tabel `uploads` (maksimal 4 MB, karena batas body Vercel 4,5 MB) dan
diakses lewat `/api/upload/<kode>`. Dengan Drive aktif, file besar **tidak melewati Vercel**:
browser membuat sesi Google Drive Resumable Upload lalu mengirim chunk 8 MB langsung ke Google,
dengan progress bar, retry otomatis 3×, dan nama file `[KODE]_[NamaPelanggan]_[NamaAsli]`.
Batas praktisnya mengikuti Google Drive (5 TB per file), bukan batas serverless.

### Penyimpanan file di Google Drive (opsional)

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
- ZIP tetap tanpa kompresi dan mengambil file dari Drive/DB.

### WhatsApp

Ada tiga provider. **Rekomendasi produksi: Meta WhatsApp Cloud API**, karena hosted dan tidak
menyisipkan watermark pihak ketiga.

```
WA_PROVIDER=cloud
META_WA_TOKEN=system-user-token-dari-meta
META_WA_PHONE_ID=phone-number-id-dari-meta
META_WA_VERSION=v26.0
META_WA_VERIFY_TOKEN=string-acak-untuk-verifikasi-webhook
META_WA_APP_SECRET=app-secret-untuk-tanda-tangan-webhook (opsional)
ADMIN_WHATSAPP_NUMBER=0895329940950
```

1. Buat Meta App dengan use case WhatsApp, lalu daftarkan nomor bisnis (bukan nomor pribadi).
2. Pakai **system user token** permanen, bukan token sementara dari App Dashboard.
3. Daftarkan webhook `https://intorma-psi.vercel.app/api/wa/webhook` dengan verify token yang sama
   dengan `META_WA_VERIFY_TOKEN`, lalu subscribe field `messages`.
4. Ajukan template pesan yang disetujui Meta untuk notifikasi di luar jendela 24 jam. Di dalam
   jendela 24 jam setelah pelanggan membalas, aplikasi mengirim teks biasa.

Pesan teks di luar jendela 24 jam ditolak Meta dengan kode `131047`; aplikasi akan menampilkan
pesan error tersebut di diagnostik. Nomor pengirim berubah dari nomor lama, jadi beri tahu pelanggan.

Fonnte masih didukung sebagai alternatif hosted:

```
WA_PROVIDER=fonnte
FONNTE_TOKEN=token-dari-dashboard-fonnte
WA_WEBHOOK_SECRET=string-acak-untuk-webhook
ADMIN_WHATSAPP_NUMBER=0895329940950
```

1. Daftar di [fonnte.com](https://fonnte.com), buat device, lalu hubungkan WhatsApp dengan scan QR
   sekali di dashboard Fonnte.
2. Salin token device ke `FONNTE_TOKEN` di Vercel.
3. Set webhook device ke `https://intorma-psi.vercel.app/api/wa/webhook?s=WA_WEBHOOK_SECRET`.
4. Aktifkan autoread di device Fonnte.

Fonnte menyimpan sesi WhatsApp di server mereka, jadi notifikasi dan balasan `status INT-DDMMYY001`
tetap berjalan walau PC mati. `connectOnly=false` membuat pesan tetap diantrekan Fonnte saat device
sedang reconnect. Branding “sent via fonnte” ditentukan oleh paket/device Fonnte, bukan parameter API;
satu-satunya cara menghapusnya adalah pindah provider atau mengaktifkan fitur branding di paket Fonnte.

OpenWA tetap didukung untuk self-hosted:

```
WA_PROVIDER=openwa
OPENWA_BASE_URL=https://gateway-publik-stabil.example.com
OPENWA_API_KEY=...
OPENWA_SESSION=intorma
```

`OPENWA_BASE_URL` produksi **tidak boleh** memakai `127.0.0.1` atau quick tunnel
`trycloudflare.com`, karena URL itu mati saat PC/tunnel berhenti. Untuk OpenWA always-on, jalankan
gateway di VPS dengan domain HTTPS stabil dan persistent volume.

Kalau gateway tidak bisa dijangkau dari Vercel, pesan otomatis masuk `wa_outbox` dan dikirim oleh
`npm run wa:agent`. Alias lama `OPENWA_URL`, `OPENWA_KEY`, dan `ADMIN_WA` masih dibaca kalau
variabel baru kosong.

Balasan otomatis `status INT-DDMMYY001` lewat OpenWA memakai `npm run wa:agent` dan
`npm run wa:webhook` (webhook lokal `http://127.0.0.1:2786/webhook`). Variabel tambahan:
`WA_INBOX_PORT` (default `2786`) dan opsional `WA_INBOX_SECRET` (default memakai
`OPENWA_WEBHOOK_SECRET`). Di Windows, task `intorma-openwa` dan `intorma-wa-agent` menjalankan
kedua proses otomatis saat login dan restart bila mati. Log ada di `logs/openwa.log` dan
`logs/wa-agent.log`.

Kalau sudah pindah ke provider hosted (Cloud API/Fonnte), nonaktifkan task OpenWA agar PC tidak lagi
menjalankan gateway lama:

```powershell
Disable-ScheduledTask -TaskName intorma-openwa
Disable-ScheduledTask -TaskName intorma-wa-agent
```

Script OpenWA tetap bisa dijalankan manual untuk pengembangan.

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
- **Pesan klien**: balasan yang bukan perintah `status` diteruskan ke WhatsApp admin, maksimal sekali
  per nomor per hari (`inbound-<nomor>-<tanggal>`) supaya kuota tetap hemat.
- **Pengaturan notifikasi**: `/admin/pengaturan` punya dua sakelar terpisah untuk pengingat klien dan
  rangkuman admin.

Kolom `orders.internal_note` ditambahkan lewat `npm run db:migrate` (idempoten).
