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

Untuk produk cetak, pelanggan menempel link file (Google Drive/WeTransfer). Pembayaran memakai
transfer manual dan admin mencocokkannya dari `/admin`. Notifikasi WhatsApp diantrekan lewat
`wa_outbox`; jalankan `npm run openwa` dan `npm run wa:agent` di mesin yang sama dengan gateway.
