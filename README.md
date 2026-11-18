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

| Variabel | Arti |
| --- | --- |
| `DATABASE_URL` | Connection string Neon (pakai yang pooled) |
| `ADMIN_PASSWORD` | Password halaman admin |
| `ADMIN_SECRET` | Kunci tanda tangan cookie sesi admin |
| `ADMIN_WA` | Nomor yang menerima notifikasi pesanan baru |
| `NEXT_PUBLIC_SITE_URL` | URL publik situs untuk link di pesan WA |
| `OPENWA_URL` | Alamat gateway, default `http://127.0.0.1:2785` |
| `OPENWA_KEY` | API key admin gateway (header `X-API-Key`) |
| `OPENWA_SESSION` | Nama atau UUID sesi WhatsApp, default `intorma` |
| `OPENWA_WEBHOOK_SECRET` | Dicek di `?s=` oleh `/api/wa/webhook` |

## Deploy ke Vercel

Aplikasi Next.js bisa langsung di-deploy ke Vercel; **gateway OpenWA tidak bisa** karena butuh
proses Chrome/WhatsApp yang berjalan terus. Pilihan yang aman:

1. Deploy folder ini ke Vercel (framework terdeteksi otomatis, tanpa `vercel.json` khusus).
2. Tambahkan environment yang sama di Project Settings → Environment Variables. Untuk produksi:
   - `NEXT_PUBLIC_SITE_URL=https://domain-kamu.com`
   - `DATABASE_URL` dari Neon
   - `ADMIN_PASSWORD`, `ADMIN_SECRET`, `ADMIN_WA`
   - `OPENWA_*` hanya jika gateway bisa diakses dari internet.
3. Jalankan migrasi sekali dari mesin lokal terhadap database produksi:
   `npm run db:migrate` (dengan `DATABASE_URL` produksi).
4. Jalankan OpenWA di VPS/komputer yang selalu hidup dan beri alamat HTTPS publik. Daftarkan
   webhook sesi ke `https://domain-kamu.com/api/wa/webhook?s=<OPENWA_WEBHOOK_SECRET>`.
   Jika gateway tetap di komputer lokal, Vercel tidak bisa menjangkaunya; notifikasi WA akan
   dilewati sampai `OPENWA_URL` diisi alamat publik.

Perintah build: `npm run build`, start: `npm run start`.

## Struktur singkat

    db/schema.sql            tabel + seed layanan (idempoten)
    scripts/migrate.mjs      menjalankan schema.sql
    scripts/gateway.mjs      tunnel + Next + sesi & webhook OpenWA
    src/app/actions.ts       server action: order, login, admin CRUD, WA
    src/app/api/wa/webhook   balasan otomatis "status KODE"
    src/components           Nav/Footer, form order, editor admin
    src/lib                  db, auth, settings, format, status, WA
