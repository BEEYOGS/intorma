# in.torma — order jasa desain

Situs pemesanan jasa desain **in.torma** ("Creative without idea"). Pelanggan mengisi brief,
mendapat kode pesanan, memantau progres, dan melihat instruksi transfer. Admin mengelola
pesanan, layanan/harga, serta rekening pembayaran dari satu tempat.

Stack: Next.js 15 (App Router) + Tailwind CSS 3 + Neon Postgres + OpenWA (opsional).
Tampilan memakai tema **monochrome intorma** (ramp swatch merek, sudut khas, tiket/barcode).
Detail visual ada di `DESIGN.md`. Font di-host lokal lewat `next/font/local`.

> URL produksi yang aktif: **https://intorma-psi.vercel.app**. Domain `torma-psi.vercel.app`
> (tanpa `in`) bukan alias deployment ini dan akan menampilkan 404 Vercel sampai alias/dns
> diperbaiki di pengaturan project Vercel.

## Menjalankan lokal

1. `npm install`
2. Salin `.env.example` ke `.env.local`, lalu isi nilainya.
3. `npm run db:migrate` — membuat tabel, kolom baru, `wa_outbox`, dan seed layanan.
4. `npm run dev` → http://localhost:3000 (atau port yang ditampilkan Next).

Halaman:

| URL | Isi |
| --- | --- |
| `/` | Beranda: layanan, cara kerja, pembayaran, FAQ |
| `/order` | Formulir pesanan (harga per item bisa dihitung otomatis) |
| `/lacak` | Cari pesanan dengan kode |
| `/lacak/INT-XXXXXX` | Status, riwayat, harga, dan pembayaran |
| `/admin` | Daftar pesanan, filter, edit harga/status/pembayaran |
| `/admin/layanan` | Kelola layanan dan harga |
| `/admin/pengaturan` | Rekening pembayaran dan catatan transfer |

Password admin berasal dari `ADMIN_PASSWORD`. Sesi disimpan dalam cookie bertanda tangan
`ADMIN_SECRET`.

## Pembayaran

Instruksi transfer disimpan di tabel `app_settings` (bisa diubah dari `/admin/pengaturan`).
Setelah transfer terverifikasi, admin mencentang **"Pembayaran sudah masuk"** di pesanan dan
halaman lacak klien menampilkan status **Lunas**.

Logo BCA di `public/bca.svg` hanya tampil bila nama bank mengandung "BCA".

## WhatsApp (OpenWA gateway)

Integrasi memakai [OpenWA](https://openwa.dev) gateway self-hosted. Ada tiga fungsi berbeda:

1. **Tautan chat publik** (`wa.me` / WhatsApp Web) — selalu bekerja, tidak butuh gateway.
2. **Notifikasi keluar** (order baru ke admin, update status ke pelanggan) — dikirim lewat OpenWA.
3. **Balasan otomatis masuk** (`status INT-XXXXXX`) — masuk lewat webhook OpenWA ke `/api/wa/webhook`.

Karena **Vercel tidak bisa menjangkau OpenWA di `localhost`**, notifikasi keluar dari deployment
Vercel disimpan ke tabel `wa_outbox` di database, lalu dikirim oleh worker yang berjalan di
komputer yang menjalankan OpenWA.

### Jalankan OpenWA + worker (notifikasi dari Vercel)

1. Jalankan gateway OpenWA dan pastikan `.env.local` berisi `OPENWA_URL`, `OPENWA_KEY`,
   `OPENWA_SESSION`, `DATABASE_URL`.
2. Tautkan sesi WhatsApp (scan QR):

   ```bash
   npm run wa:session
   ```

   Buka `.tools/qr-<sesi>.html` (auto-refresh) lalu scan dari WhatsApp → Perangkat tertaut.
3. Jalankan worker antrean:

   ```bash
   npm run wa:agent
   ```

4. Daftarkan webhook ke URL publik agar balasan `status INT-XXXXXX` masuk ke situs produksi:

   ```bash
   SITE_WEBHOOK_URL=https://intorma-psi.vercel.app npm run wa:webhook
   ```

   Pastikan `OPENWA_WEBHOOK_SECRET` di `.env.local` **sama** dengan nilai di environment Vercel.
5. Cek kondisi:

   ```bash
   npm run wa:check
   ```

### Mode lokal/gateway terpadu

Jika Next.js dan OpenWA berjalan di mesin yang sama, `npm run gateway` bisa membantu
menjalankan tunnel/app/gateway/webhook lokal sekaligus worker antrean (lihat `scripts/gateway.mjs`).
Sesuaikan path OpenWA di `scripts/openwa.mjs` bila perlu.

### Catatan penting

- Nomor admin di `ADMIN_WA` sebaiknya **bukan** nomor yang sama dengan akun WhatsApp gateway,
  supaya uji perintah status tidak bentrok dengan pesan `fromMe`.
- Pesan WA bersifat *best effort*: jika gateway/worker belum siap, order tetap tersimpan dan
  notifikasi tertunda di antrean (atau perlu dikirim ulang secara manual).
- Untuk produksi stabil, jalankan OpenWA + `wa:agent` di VPS/komputer yang selalu hidup.

## Environment

| Variabel | Status | Arti |
| --- | --- | --- |
| `DATABASE_URL` | Wajib | Connection string Neon (pakai yang pooled) |
| `ADMIN_PASSWORD` | Wajib | Password halaman admin |
| `ADMIN_SECRET` | Wajib | Kunci acak panjang untuk tanda tangan cookie sesi |
| `NEXT_PUBLIC_SITE_URL` | Disarankan | URL publik situs (link di pesan WA/webhook) |
| `NEXT_PUBLIC_WA_NUMBER` | Disarankan | Nomor WhatsApp publik untuk tombol chat |
| `ADMIN_WA` | Opsional | Nomor penerima notifikasi pesanan baru |
| `OPENWA_URL` | Opsional | URL OpenWA (jangan localhost di Vercel) |
| `OPENWA_KEY` | Opsional | API key OpenWA (`x-api-key`) |
| `OPENWA_SESSION` | Opsional | Nama/ID sesi WhatsApp, default `intorma` |
| `OPENWA_WEBHOOK_SECRET` | Opsional | Rahasia query `?s=` untuk `/api/wa/webhook` |
| `WA_QUEUE_ONLY` | Opsional | `1` untuk memaksa antrean, tidak kirim langsung |
| `WA_POLL_MS` | Opsional | Interval polling worker (ms), default 5000 |

## Deploy ke Vercel

`vercel.json` sudah disiapkan. Langkah umum:

1. Hubungkan repo/project ke Vercel (`beeyogs-projects/in.torma`).
2. Isi Environment Variables (Production/Preview sesuai kebutuhan): `DATABASE_URL`, `ADMIN_PASSWORD`,
   `ADMIN_SECRET`, `NEXT_PUBLIC_SITE_URL=https://intorma-psi.vercel.app`, `NEXT_PUBLIC_WA_NUMBER`,
   `ADMIN_WA`, `OPENWA_WEBHOOK_SECRET`, dll. **Jangan** set `OPENWA_URL` ke localhost.
3. Jalankan migrasi sekali ke database produksi:

   ```bash
   npm run db:migrate
   ```

4. Pastikan domain/alias Vercel mengarah ke deployment yang benar (`intorma-psi.vercel.app`).
5. Untuk notifikasi WA dari Vercel, jalankan `npm run wa:agent` di mesin dengan OpenWA aktif dan
   daftarkan webhook publik (`npm run wa:webhook`).

## Struktur singkat

```text
db/schema.sql            tabel + wa_outbox + seed layanan (idempoten)
scripts/migrate.mjs      menjalankan schema.sql
scripts/wa-agent.mjs     worker kirim antrean wa_outbox via OpenWA
scripts/wa-webhook.mjs   daftar/update webhook OpenWA ke situs publik
scripts/wa-check.mjs     diagnosa gateway/sesi/webhook/antrean
src/app/actions.ts       server action: order, login, admin CRUD, WA
src/app/api/wa/webhook   balasan otomatis "status INT-XXXXXX"
src/components           UI (Chrome, form order, editor admin, WhatsApp link)
src/lib                  db, auth, settings, format, status, pricing, wa, site
```

> Jangan commit `.env.local` atau kredensial apa pun.
