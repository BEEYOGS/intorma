# in.tarma - order jasa desain

Next.js 15 (App Router) + Tailwind 3 + Neon Postgres + OpenWA.

## Jalankan
1. `npm install`
2. `cp .env.example .env.local` lalu isi nilainya
3. `npm run db:migrate` (membuat tabel + 6 layanan contoh)
4. `npm run dev` -> http://localhost:3000, admin di /admin

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
