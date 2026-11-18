# in.torma — order jasa desain

Situs pemesanan jasa desain **in.torma** ("Creative without idea"). Pelanggan mengisi brief,
mendapat kode pesanan, memantau progres, dan melihat instruksi transfer. Admin mengelola
pesanan, layanan/harga, serta rekening pembayaran dari satu tempat.

Stack: Next.js 15 (App Router) + Tailwind CSS 3 + Neon Postgres + OpenWA (opsional).
Tampilan memakai tema gelap monokrom (latar arang, teks kertas hangat), tipografi editorial,
dan aset logo milik sendiri. Seluruh font di-host lokal lewat `next/font/local`, jadi tidak ada
permintaan ke Google Fonts.

## Menjalankan lokal

1. `npm install`
2. Salin `.env.example` ke `.env.local`, lalu isi nilainya.
3. `npm run db:migrate` — membuat tabel, kolom baru, dan 6 layanan contoh.
4. `npm run dev` → http://localhost:3000 (port bisa berbeda; lihat output Next).

Halaman:

| URL | Isi |
| --- | --- |
| `/` | Beranda: layanan, cara kerja, pembayaran, FAQ |

Harga layanan cetak dihitung otomatis dari jumlah yang diisi pelanggan (mis. spanduk
Rp25.000/meter × panjang). Riset harga awal dan sumbernya ada di `PRICING.md`; pengaturan
mode harga, satuan, dan batas jumlah ada di `/admin/layanan`.

| `/order` | Formulir pesanan |
| `/lacak` | Cari pesanan dengan kode |
| `/lacak/INT-XXXXXX` | Status, riwayat, harga, dan pembayaran |
| `/admin` | Daftar pesanan, filter status, edit harga/status/pembayaran |
| `/admin/layanan` | Tambah, ubah, aktif/nonaktifkan layanan dan harga |
| `/admin/pengaturan` | Rekening pembayaran dan catatan transfer |

Password admin berasal dari `ADMIN_PASSWORD`. Sesi disimpan dalam cookie bertanda tangan
`ADMIN_SECRET` (isi string acak yang panjang).

## Pembayaran

Instruksi transfer disimpan di tabel `app_settings`, bukan di environment, supaya bisa diubah
dari `/admin/pengaturan`. Nilai awal:

- Bank **BCA**
- Nomor rekening **8171700213**
- Atas nama **Yogi**

Setelah pelanggan transfer, admin membuka pesanan di `/admin` lalu mencentang
**“Pembayaran sudah masuk”**. Halaman lacak pelanggan langsung menampilkan status **Lunas**.
Pelanggan juga bisa menekan tombol konfirmasi transfer yang membuka WhatsApp dengan kode
pesanan sudah terisi.

Logo BCA asli disimpan sebagai `public/bca.svg`, diambil dari [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bank_Central_Asia.svg)
(`Bank Central Asia.svg`, PD-textlogo). Logo hanya tampil bila nama bank di pengaturan mengandung
“BCA”; untuk bank lain tampil teks saja. Merek BCA tetap milik PT Bank Central Asia Tbk.

## WhatsApp (OpenWA gateway)

Notifikasi WA memakai [OpenWA](https://github.com/rmyndharis/OpenWA) — gateway WhatsApp
self-hosted (NestJS). Di mesin ini repo-nya ada di `..\OpenWA` dan dijalankan **tanpa Docker**
memakai Node 22 portable (`.tools\node22`), karena build native `better-sqlite3` di Node 26
butuh Visual Studio C++ yang tidak terpasang.

Persiapan sekali:

    cd ..\OpenWA
    # --ignore-scripts: lewati node-gyp (better-sqlite3 13 sudah bawa prebuilt N-API)
    $env:PUPPETEER_SKIP_DOWNLOAD='1'
    C:\Users\<user>\.tools\node22\npm.cmd install --ignore-scripts
    # patch whatsapp-web.js yang biasanya dipasang saat install
    C:\Users\<user>\.tools\node22\node.exe scripts\postinstall.js
    C:\Users\<user>\.tools\node22\npm.cmd run build

Butuh Chrome terpasang (dipakai lewat `PUPPETEER_EXECUTABLE_PATH` di `..\OpenWA\.env`).
`WEBHOOK_SSRF_PROTECT=false` di file itu supaya webhook boleh dikirim ke `127.0.0.1`.

Lalu dari folder `intorma`:

    npm run openwa        # gateway di http://127.0.0.1:2785
    npm run wa:session    # buat/start sesi "intorma", simpan QR ke .tools\qr-intorma.png
    # buka PNG itu -> WhatsApp > Perangkat tertaut -> scan

    npm run gateway       # tunnel publik + Next.js + daftarkan webhook sesi otomatis

`npm run gateway` membuka tunnel cloudflared, memastikan sesi WhatsApp aktif, lalu membuat /
memperbarui webhook sesi ke `http://127.0.0.1:3001/api/wa/webhook?s=<OPENWA_WEBHOOK_SECRET>`
(event `message.received`). Webhook memakai alamat lokal (bukan URL tunnel) karena OpenWA
berjalan di mesin yang sama; URL tunnel hanya dipakai untuk link di pesan. URL tunnel berubah
tiap kali dijalankan.

Balasan otomatis: pelanggan kirim `status INT-XXXXXX` ke nomor WhatsApp gateway, lalu dibalas
status, total, status pembayaran, dan rekening bila belum lunas. Nomor admin di `ADMIN_WA` sama
dengan nomor gateway, jadi untuk mencoba perintah ini pakai nomor WhatsApp lain (pesan dari
nomor sendiri diabaikan untuk menghindari loop).

Kalau OpenWA mati, pesanan tetap tersimpan; hanya notifikasi WA yang dilewati.

## Environment

| Variabel | Status | Arti |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Connection string Neon (pakai yang pooled) |
| `ADMIN_PASSWORD` | Wajib | Password halaman admin |
| `ADMIN_SECRET` | Wajib | Kunci acak panjang untuk tanda tangan cookie sesi |
| `NEXT_PUBLIC_SITE_URL` | Disarankan | URL publik situs untuk link di pesan WA. Tanpa ini, Vercel memakai `VERCEL_URL` otomatis |
| `ADMIN_WA` | Opsional | Nomor yang menerima notifikasi pesanan baru |
| `OPENWA_URL` | Opsional | Alamat gateway yang bisa diakses publik, mis. `https://wa.domain.com` |
| `OPENWA_KEY` | Opsional | API key admin gateway (header `X-API-Key`) |
| `OPENWA_SESSION` | Opsional | Nama atau UUID sesi WhatsApp, default `intorma` |
| `OPENWA_WEBHOOK_SECRET` | Opsional | Dicek di `?s=` oleh `/api/wa/webhook` |

## Aplikasi yang bisa di-download & pembagian akses

Situs ini adalah **PWA (Progressive Web App)**—istilah untuk website yang bisa dibuka di browser
*dan* dipasang ke layar utama seperti aplikasi. Jadi **bukan aplikasi WhatsApp / gateway WA**, bukan
juga aplikasi terpisah yang harus di-update manual. Satu source code, satu database, fitur web dan
"app" identik. Aplikasinya tetap online (butuh internet), sama seperti web.

- Buka situs di Chrome/Edge → menu ⋮ → **Install / Add to Home Screen**.
- Tombol **“Install aplikasi”** juga muncul di footer saat browser mendukung.
- Ikon dan splash memakai **file SVG yang sama dengan web** (`public/icon.svg`). PNG 192/512 dan
  versi maskable di `public/icons/` dihasilkan dari SVG itu juga, supaya tampilannya identik.
- Service worker hanya menyimpan halaman publik (`/`, `/order`, `/lacak`) untuk fallback offline.
  **Halaman `/admin` dan `/api/` tidak pernah di-cache**, jadi data pesanan tidak tertinggal di
  perangkat orang lain.

### Pembagian akses
- **Pelanggan / orang lain**: cukup dapat link publik `https://domain-kamu.com`. Mereka bisa pesan,
  melihat harga otomatis, dan lacak pesanan. Tidak perlu login.
- **Kamu (admin)**: buka `https://domain-kamu.com/admin` lalu masukkan `ADMIN_PASSWORD`.
  URL admin tidak ditampilkan di navigasi publik—jangan dibagikan ke grup pelanggan.
- Cookie admin bertanda tangan + middleware menolak akses `/admin` tanpa sesi, dan setiap server
  action masih memeriksa ulang status admin. Tombol **Keluar** di header admin menghapus sesi.

## Deploy ke Vercel

`vercel.json` sudah disiapkan: framework Next.js, `npm install` + `npm run build`, output `.next`,
dan beberapa header keamanan dasar. Tidak perlu mengubahnya.

Aplikasi Next.js bisa langsung di-deploy ke Vercel; **gateway OpenWA tidak bisa** karena butuh
proses Chrome/WhatsApp yang berjalan terus. Langkahnya:

1. Import repository ini di Vercel (atau jalankan `vercel --prod` dari folder `intorma`).
2. Isi Environment Variables di **Project Settings → Environment Variables** untuk
   **Production** (dan Preview bila perlu):

   ```text
   DATABASE_URL=postgresql://...@...neon.tech/...?sslmode=require
   ADMIN_PASSWORD=ganti-dengan-password-kuat
   ADMIN_SECRET=string-acak-panjang-minimal-32-karakter
   ADMIN_WA=6289...
   NEXT_PUBLIC_SITE_URL=https://domain-kamu.com
   ```

   `NEXT_PUBLIC_SITE_URL` dipakai saat build untuk tautan di pesan WhatsApp. Kalau belum punya
   domain, biarkan kosong—kode memakai `VERCEL_URL` otomatis.

3. Jalankan migrasi **sekali** ke database produksi dari mesin lokal:

   ```bash
   cd intorma
   # isi dulu DATABASE_URL di .env.local dengan connection-string produksi
   npm run db:migrate
   ```

   Migrasi aman diulang (idempoten) dan tidak menghapus data yang sudah ada. Jangan
   menaruh connection-string produksi di chat atau file yang ter-commit.

4. Cek deploy: buka `https://domain-kamu.com`, lalu `/admin` dan pastikan login berhasil.

5. **WhatsApp (opsional tapi disarankan)**: jalankan OpenWA di VPS/komputer yang selalu hidup
   dengan alamat HTTPS publik, lalu isi juga:

   ```text
   OPENWA_URL=https://wa.domain-kamu.com
   OPENWA_KEY=api-key-gateway
   OPENWA_SESSION=intorma
   OPENWA_WEBHOOK_SECRET=rahasia-webhook
   ```

   Daftarkan webhook sesi ke:

   ```text
   https://domain-kamu.com/api/wa/webhook?s=<OPENWA_WEBHOOK_SECRET>
   ```

   event `message.received`. Pelanggan bisa kirim `status INT-XXXXXX` dan dibalas otomatis.
   Kalau `OPENWA_*` kosong atau gateway tidak bisa dijangkau Vercel, pesanan tetap tersimpan
   dan halaman lacak tetap jalan—hanya notifikasi WA yang dilewati.

> Catatan: jangan pernah commit `.env.local`. File sudah masuk `.gitignore`.

## Struktur singkat

    db/schema.sql            tabel + seed layanan (idempoten)
    scripts/migrate.mjs      menjalankan schema.sql
    scripts/gateway.mjs      tunnel + Next + sesi & webhook OpenWA
    src/app/actions.ts       server action: order, login, admin CRUD, WA
    src/app/api/wa/webhook   balasan otomatis "status KODE"
    src/components           Nav/Footer, form order, editor admin
    src/lib                  db, auth, settings, format, status, WA
