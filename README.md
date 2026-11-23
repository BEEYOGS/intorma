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

Untuk produk cetak, pelanggan bisa **upload langsung** (maksimal 4 MB, disimpan di tabel
`uploads` dan diakses lewat `/api/upload/<kode>`) atau menempel link Google Drive/WeTransfer.
Notifikasi WhatsApp diantrekan lewat `wa_outbox`; jalankan `npm run openwa` dan `npm run wa:agent`
di mesin yang sama dengan gateway.

### Penyimpanan file di Google Drive (opsional)

Secara default file disimpan di tabel `uploads` (maksimal 4 MB). Untuk memakai kuota Google Drive:

1. Buat project di Google Cloud Console dengan akun Google kamu.
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
“Service Accounts do not have storage quota”). Kode masih mendukung service account kalau nanti
memakai Shared Drive/Workspace.

Setelah itu upload otomatis masuk Drive (maksimal 20 MB per file), sedangkan preview/download/ZIP
tetap lewat endpoint aplikasi yang sudah mengecek sesi pelanggan. Tanpa kedua env var tersebut,
perilaku kembali ke penyimpanan database seperti sebelumnya.

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
