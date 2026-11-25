// Sumber harga & metadata katalog. Aman dijalankan berulang kali (upsert by id).
//
// Pakai: npm run db:catalog
//
// Acuan harga pasar Indonesia (riset 2026):
// - Logo: JasaDesain mulai Rp249.000 → paket basic Rp250.000
// - Spanduk flexi: Tokopedia Rp25.000/m², TiPrint Rp30.000/m² (China 280gr)
// - Poster A3 art paper 150gr: Primagraphia Rp5.000/lembar
// - Kartu nama art carton: kisaran Rp22.000–50.000/box → Rp30.000/box
// - Stiker vinyl A3+: Primagraphia Rp9.000, PRINTORA Rp25.000 → Rp10.000/lembar
// - Kaos cotton combed 30s + sablon DTF: VendorBaju Rp50.000–70.000/pcs,
//   e-commerce satuan Rp47.000–94.000 → Rp65.000/pcs (minimum 1 pcs)
// Angka di sini adalah harga dasar; opsi bahan/ukuran/finishing menambah delta.
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi di .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const catalog = [
  {
    id: "logo",
    name: "Logo dan identitas",
    blurb: "Logo, palet warna, dan panduan pemakaian dasar.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 250_000, min_price: 250_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 5, sort: 1,
    price_note: "Paket basic Rp250.000 (1 konsep, 2× revisi). Standard dan premium tersedia sebagai opsi.",
  },
  {
    id: "poster",
    name: "Poster dan banner",
    blurb: "Poster acara, spanduk, atau materi cetak lain.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 100_000, min_price: 100_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 2, sort: 2,
    price_note: "Harga desain satu materi. Cetak bisa ditambahkan terpisah.",
  },
  {
    id: "feed",
    name: "Feed Instagram",
    blurb: "Satu set postingan dengan gaya yang seragam.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 150_000, min_price: 150_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 3, sort: 3,
    price_note: "Harga per paket jumlah postingan, bukan per post.",
  },
  {
    id: "kemasan",
    name: "Kemasan dan label",
    blurb: "Label produk, stiker, dan desain kemasan.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 300_000, min_price: 300_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 4, sort: 4,
    price_note: "Harga desain kemasan. Cetak menyesuaikan bahan dan jumlah.",
  },
  {
    id: "thumbnail",
    name: "Thumbnail dan cover",
    blurb: "Thumbnail video, cover podcast, atau sampul.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 60_000, min_price: 60_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 1, sort: 5,
    price_note: "Harga desain thumbnail. File jadi dikirim lewat WhatsApp.",
  },
  {
    id: "spanduk-flexi",
    name: "Spanduk Flexi",
    blurb: "Cetak banner outdoor. Harga per meter persegi.",
    category: "print", pricing_model: "area", pricing_mode: "per_unit", unit_label: "m²",
    price_from: 25_000, min_price: 30_000, min_qty: 1, max_qty: 10_000,
    round_to: 1_000, min_area_m2: 1, requires_file: true, days: 2, sort: 6,
    price_note: "Harga per m² (lebar × tinggi). Minimal 1 m², dibulatkan ke Rp1.000.",
  },
  {
    id: "lain",
    name: "Belum tahu butuh apa",
    blurb: "Ceritakan saja kebutuhanmu, nanti kami arahkan.",
    category: "other", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 0, min_price: 0, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 3, sort: 6,
    price_note: "Kebutuhan khusus. Admin akan menghubungi untuk harga dan jadwal.",
  },
  {
    id: "poster-a3",
    name: "Cetak Poster A3+",
    blurb: "Cetak poster A3+ full color, art paper 150gr. Harga per lembar.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "lembar",
    price_from: 5_000, min_price: 5_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 1, sort: 7,
    price_note: "Harga per lembar A3+, cetak full color satu sisi.",
  },
  {
    id: "kartu-nama",
    name: "Cetak Kartu Nama",
    blurb: "Kartu nama art carton, 1 box isi 100 lembar. Harga per box.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "box",
    price_from: 30_000, min_price: 30_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 2, sort: 8,
    price_note: "Harga per box (100 lembar), sudah termasuk box kartu nama.",
  },
  {
    id: "stiker-vinyl",
    name: "Cetak Stiker Vinyl A3+",
    blurb: "Stiker vinyl tahan air, A3+. Harga per lembar.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "lembar",
    price_from: 10_000, min_price: 10_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 2, sort: 9,
    price_note: "Harga per lembar A3+, belum termasuk potong custom.",
  },
  {
    id: "kaos-dtf",
    name: "Kaos Sablon DTF",
    blurb: "Kaos cotton combed 30s, sablon DTF full color. Minimum 1 pcs.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "pcs",
    price_from: 65_000, min_price: 65_000, min_qty: 1, max_qty: 500,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 3, sort: 10,
    price_note: "Harga per pcs sudah termasuk kaos cotton combed 30s + sablon DTF 1 titik. Ukuran, posisi sablon, dan bahan menambah biaya.",
  },
  {
    id: "x-banner",
    name: "X-Banner",
    blurb: "Banner portable dengan kaki X, cocok untuk pameran dan promo.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "unit",
    price_from: 85_000, min_price: 85_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 2, sort: 11,
    price_note: "Harga per unit X-Banner lengkap dengan rangka. Ukuran menentukan harga dasar.",
  },
  {
    id: "poster-a2",
    name: "Cetak Poster A2",
    blurb: "Poster A2 full color untuk display toko dan acara.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "lembar",
    price_from: 15_000, min_price: 15_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 1, sort: 12,
    price_note: "Harga per lembar A2, cetak full color satu sisi.",
  },
  {
    id: "kartu-pos",
    name: "Kartu Pos",
    blurb: "Kartu pos cetak full color, cocok untuk undangan dan merchandising.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "lembar",
    price_from: 3_500, min_price: 3_500, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 2, sort: 13,
    price_note: "Harga per lembar kartu pos, sudah termasuk cetak full color.",
  },
  {
    id: "stiker-label",
    name: "Stiker Label Produk",
    blurb: "Stiker label kemasan dalam berbagai ukuran, siap tempel.",
    category: "print", pricing_model: "per_unit", pricing_mode: "per_unit", unit_label: "lembar",
    price_from: 500, min_price: 500, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: true, days: 2, sort: 14,
    price_note: "Harga per lembar label. Minimum cetak 100 lembar per desain.",
  },
  {
    id: "foto-produk",
    name: "Foto Produk",
    blurb: "Pemotretan dan editing foto produk untuk katalog dan marketplace.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 150_000, min_price: 150_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 3, sort: 15,
    price_note: "Harga paket foto produk. File mentah bisa dikirim lewat link sebelum sesi.",
  },
  {
    id: "desain-web",
    name: "Desain Website",
    blurb: "Desain tampilan website/landing page beserta panduan handoff.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 750_000, min_price: 750_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 7, sort: 16,
    price_note: "Harga desain tampilan. Hosting, domain, dan development tidak termasuk.",
  },
  {
    id: "copywriting",
    name: "Copywriting",
    blurb: "Naskah promosi untuk website, iklan, dan media sosial.",
    category: "design", pricing_model: "flat", pricing_mode: "flat", unit_label: "",
    price_from: 200_000, min_price: 200_000, min_qty: 1, max_qty: 10_000,
    round_to: 0, min_area_m2: 1, requires_file: false, days: 3, sort: 17,
    price_note: "Harga per paket jumlah naskah, bukan per kata.",
  },
];

for (const item of catalog) {
  await sql.query(
    `insert into services
       (id, name, blurb, price_from, days, sort, active, pricing_mode, unit_label,
        min_qty, max_qty, category, pricing_model, min_price, round_to, min_area_m2,
        requires_file, price_note)
     values ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
     on conflict (id) do update set
       name = excluded.name,
       blurb = excluded.blurb,
       price_from = excluded.price_from,
       days = excluded.days,
       sort = excluded.sort,
       active = true,
       pricing_mode = excluded.pricing_mode,
       unit_label = excluded.unit_label,
       min_qty = excluded.min_qty,
       max_qty = excluded.max_qty,
       category = excluded.category,
       pricing_model = excluded.pricing_model,
       min_price = excluded.min_price,
       round_to = excluded.round_to,
       min_area_m2 = excluded.min_area_m2,
       requires_file = excluded.requires_file,
       price_note = excluded.price_note`,
    [
      item.id, item.name, item.blurb, item.price_from, item.days, item.sort,
      item.pricing_mode, item.unit_label, item.min_qty, item.max_qty,
      item.category, item.pricing_model, item.min_price, item.round_to,
      item.min_area_m2, item.requires_file, item.price_note,
    ],
  );
}

const rows = await sql`select id, price_from, category from services order by sort, name`;
console.log(`Katalog tersinkron: ${rows.length} layanan.`);
for (const row of rows) {
  console.log(`- ${row.id.padEnd(16)} ${String(row.price_from).padStart(7)}  ${row.category}`);
}
