# in.tarma - order jasa desain

Next.js 15 (App Router) + Tailwind 3 + Neon Postgres + OpenWA.

## Jalankan lokal

Persyaratan: Node.js 20.9 atau lebih baru dan database Postgres di Neon.

1. Install dependensi dengan `npm install`.
2. Salin `.env.example` menjadi `.env.local` (Windows PowerShell: `Copy-Item .env.example .env.local`; macOS/Linux: `cp .env.example .env.local`).
3. Isi `DATABASE_URL`, `ADMIN_PASSWORD`, dan `ADMIN_SECRET`. Buat `ADMIN_SECRET` acak yang panjang dan jangan gunakan nilai contoh di produksi.
4. Jalankan `npm run db:migrate` untuk membuat tabel dan memasukkan enam layanan awal.
5. Jalankan `npm run dev`, lalu buka http://localhost:3000. Halaman admin ada di `/admin`.

Notifikasi WhatsApp bersifat opsional. Tanpa OpenWA, pesanan tetap tersimpan dan kode pelacakan tetap tampil setelah formulir dikirim; pengunjung dapat memakainya di `/lacak`.
Untuk tautan WhatsApp yang benar di produksi, isi `NEXT_PUBLIC_SITE_URL` dengan URL publik situs tanpa garis miring di akhir.

Untuk produksi, jalankan `npm run build` lalu `npm run start` di host Node.js yang mendukung Next.js. Pastikan seluruh variabel lingkungan di atas tersedia dan migrasi database sudah dijalankan sebelum menerima pesanan.

## OpenWA
open-wa memakai browser (puppeteer), jadi **tidak bisa jalan di Vercel**. Jalankan terpisah
(VPS/PC sendiri/Docker), Next.js hanya memanggil REST API-nya:

    npx @open-wa/wa-automate --socket -p 8002 --key "ISI_OPENWA_KEY" \
      -w "https://DOMAINMU/api/wa/webhook?s=ISI_OPENWA_WEBHOOK_SECRET"

Scan QR sekali, lalu isi `OPENWA_URL` (mis. http://IP-VPS:8002) dan `OPENWA_KEY` di .env.
Kalau OpenWA mati, pesanan tetap tersimpan; hanya notifikasi WA yang dilewati.
Sesuaikan nama header API key / bentuk endpoint di `src/lib/wa.ts` bila versi open-wa kamu berbeda.

## Ubah harga/layanan
Edit tabel `services` di Neon (atau `db/schema.sql` lalu migrate ulang untuk data baru).
