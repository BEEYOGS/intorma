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
npm run db:self-service    # kategori, model harga, dan katalog opsi
npm run db:wa-trigger      # pengaman notifikasi WhatsApp untuk order baru
```

Halaman yang dipakai pelanggan:

- `/order` — pilih layanan, atur bahan/ukuran/finishing/jumlah, lihat total, lalu kirim pesanan.
- `/lacak` dan `/lacak/INT-XXXXXX` — cek status, rincian harga, dan instruksi transfer.

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

Notifikasi langsung dikirim dengan `await` ke gateway. Kalau gateway tidak bisa dijangkau dari
Vercel, pesan otomatis masuk `wa_outbox` dan dikirim oleh `npm run wa:agent` di mesin yang sama
dengan gateway. Variabel yang dipakai:

```
OPENWA_BASE_URL=https://gateway-publik-contoh.example.com
OPENWA_API_KEY=...
OPENWA_SESSION=intorma
ADMIN_WHATSAPP_NUMBER=0895329940950
```

Alias lama `OPENWA_URL`, `OPENWA_KEY`, dan `ADMIN_WA` masih dibaca kalau variabel baru kosong.

Balasan otomatis `status INT-XXXXXX` tidak bergantung pada Vercel. `npm run wa:agent` menyalakan
webhook lokal di `http://127.0.0.1:2786/webhook` (health: `/health`), lalu
`npm run wa:webhook` mendaftarkannya ke sesi OpenWA. Jadi tidak perlu tunnel publik untuk WA.
Variabel tambahan: `WA_INBOX_PORT` (default `2786`) dan opsional `WA_INBOX_SECRET`
(default memakai `OPENWA_WEBHOOK_SECRET`).

Di Windows, task `intorma-openwa` dan `intorma-wa-agent` menjalankan kedua proses otomatis saat
login dan restart bila mati. Log ada di `logs/openwa.log` dan `logs/wa-agent.log`.

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
- **Midtrans Snap** (opsional): isi `MIDTRANS_SERVER_KEY` di environment. Tombol “Bayar sekarang”
  akan muncul di halaman lacak, dan webhook `/api/payment/webhook` menandai pesanan lunas otomatis
  setelah status `settlement`/`capture`. Set `MIDTRANS_IS_PRODUCTION=1` setelah pindah ke akun
  produksi, lalu daftarkan URL webhook tersebut di dashboard Midtrans.

Tanpa server key, alur tetap memakai transfer manual seperti sebelumnya.

### Kelola opsi dari admin

Buka `/admin/layanan`, lalu buka layanan yang ingin diatur. Di bawah form harga ada bagian
**Opsi & finishing** untuk menambah grup (bahan, ukuran, finishing, paket) dan nilainya—termasuk
harga tambahan, basis hitung (per item/per m² atau sekali pesanan), opsi default, dan status aktif.
Perubahan langsung dipakai halaman `/order` tanpa menjalankan SQL manual.
