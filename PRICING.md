# Riset item & harga (untuk harga otomatis)

Tanggal riset: 18 November 2026. Angka di bawah dipakai sebagai **harga awal** dan bisa diubah kapan saja dari `/admin/layanan`. Sistem mengalikan `harga satuan × jumlah` yang diisi pelanggan; admin tetap bisa mengubah harga final per pesanan.

## Acuan harga pasar

| Item | Harga pasar yang ditemukan | Harga awal di app | Alasan |
| --- | --- | --- | --- |
| Spanduk Flexi China 280gr | Rp25.000/m (Cetak Kilat, Flexiprint), Rp26.000/m (Jadeprint), Rp25.000–30.000/m (Printku) | **Rp25.000/meter**, min 1 m | Angka bawah-butuh sesuai contoh yang diminta. Finishing (mata ayam/selongsong) sengaja tidak dimasukkan agar transparan; dicatat di brief. |
| Poster A3+ Art Paper 150gr | Rp4.000–5.000/lembar (Cetakonline), Rp3.900/lembar (Masbro Printing), Rp5.250/lembar (Anugerah Print) | **Rp5.000/lembar** | Menengah dari kisaran, kualitas art paper 150gr. |
| Kartu Nama Art Carton, 1 box isi 100 | Rp25.000/box (Revo Print, CETAKITA, Anugerah Print, Only Print) | **Rp25.000/box** | Konsisten di banyak sumber. |
| Stiker Vinyl A3+ | Rp15.000/lembar (Tirta Anugrah), Rp10.000/lembar (Cahya Printing), mulai Rp7.000/lembar (Printing Harvest) | **Rp15.000/lembar** | Memakai acuan vinyl elusive/laminasi, bukan kertas chromo. |

Sumber:
- https://www.cetakkilat.com/spanduk-murah/spanduk
- https://www.flexiprint.id/
- https://www.jadeprint.id/p/flexy-china-280gr
- https://www.printku.co.id/p/spanduk-flexi-china-280-gsm
- https://www.cetakonline.co.id/p/poster-a3-art-paper-150-gsm-ap150
- https://www.masbroprinting.com/p/cetak-poster-a3
- https://www.anugerahprint.com/p/art-paper-150-gsm-poster-a3
- https://www.revoprintonline.com/p/cetak-kartu-nama
- https://www.cetakita.com/p/cetak-kartu-nama-box
- https://www.tirtaanugrah.com/p/stiker-vinil-glossy-a3-laminasi-cutting
- https://www.cahyaprinting.com/p/cetak-stiker-vinyl-transparan

Layanan desain (logo, poster desain, feed Instagram, kemasan, thumbnail) tetap memakai **harga awal tetap** karena lingkup kerja tidak bisa diukur per meter/lembar dengan adil.

## Cara kerja di aplikasi

1. Admin memilih mode harga **Harga tetap** atau **Dihitung per item**, lalu mengisi nama satuan (meter/lembar/box), minimal, maksimal, dan harga satuan.
2. Pelanggan memilih layanan. Untuk item per-item, muncul field jumlah dengan tombol +/− dan total yang berubah seketika.
3. Server menghitung ulang harga dengan fungsi yang sama (`src/lib/pricing.ts`), menyimpan `qty`, `unit_rate`, dan `price` ke pesanan. Jadi angka yang tampil tidak bisa dimanipulasi dari browser.
4. Halaman lacak menampilkan rincian, mis. `3 meter × Rp25.000`. Admin tetap bisa mengganti total di editor pesanan bila ada biaya finishing/kirim yang disepakati.

Catatan: ongkir dan finishing belum dihitung otomatis; keduanya sengaja dibahas lewat WhatsApp agar tidak ada biaya tersembunyi yang menggelembungkan angka di form.
