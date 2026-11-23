// Isi katalog self-service: kategori, model harga, dan opsi bahan/ukuran/
// finishing/paket. Aman dijalankan berulang kali (upsert berdasarkan kode).
//
// Pakai: npm run db:self-service
//
// Harga mengacu pada kisaran pasar percetakan Indonesia (2025/2026):
// - Flexi China 280gr: Rp17.000–25.000/m²; Flexi Korea 440gr: Rp32.000–45.000/m²
// - Poster A3 art paper 150gr: Rp5.000/lembar
// - Kartu nama art carton 260gr: Rp22.000–35.000/box (1 sisi)
// - Stiker vinyl A3+: Rp10.000–15.000/lembar
// - Logo basic: Rp250.000–350.000; standard: Rp550.000; premium: Rp900.000+
// Angka di sini adalah default yang bisa disesuaikan admin/database.
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diisi di .env.local");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const catalog = {
  logo: {
    category: "design",
    pricing_model: "flat",
    min_price: 350_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga paket desain. Revisi sesuai paket yang dipilih.",
    groups: [
      {
        code: "paket",
        label: "Paket desain",
        help: "Pilih kedalaman proses dan jumlah revisi.",
        select_type: "single",
        required: true,
        options: [
          { code: "basic", label: "Basic — 1 konsep, 2× revisi", delta: 0, basis: "order", is_default: true },
          { code: "standard", label: "Standard — 3 konsep, 4× revisi", delta: 200_000, basis: "order" },
          { code: "premium", label: "Premium — 5 konsep, 6× revisi + file master", delta: 550_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        help: "Opsional, boleh pilih lebih dari satu.",
        select_type: "multi",
        required: false,
        options: [
          { code: "rush", label: "Pengerjaan cepat 2 hari", delta: 100_000, basis: "order" },
          { code: "brandguide", label: "Panduan warna & tipografi", delta: 150_000, basis: "order" },
          { code: "sosmed", label: "Paket feed IG 3 post", delta: 150_000, basis: "order" },
        ],
      },
    ],
  },
  poster: {
    category: "design",
    pricing_model: "flat",
    min_price: 120_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga desain. Cetak bisa ditambahkan terpisah.",
    groups: [
      {
        code: "paket",
        label: "Paket desain",
        select_type: "single",
        required: true,
        options: [
          { code: "basic", label: "Basic — 1 poster, 2× revisi", delta: 0, basis: "order", is_default: true },
          { code: "standard", label: "Standard — 3 ukuran poster", delta: 180_000, basis: "order" },
          { code: "premium", label: "Premium — 5 materi + mockup", delta: 300_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "rush", label: "Pengerjaan cepat 1 hari", delta: 50_000, basis: "order" },
          { code: "printready", label: "File siap cetak (PDF CMYK)", delta: 25_000, basis: "order" },
        ],
      },
    ],
  },
  feed: {
    category: "design",
    pricing_model: "flat",
    min_price: 200_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga per paket jumlah postingan, bukan per post.",
    groups: [
      {
        code: "paket",
        label: "Jumlah postingan",
        select_type: "single",
        required: true,
        options: [
          { code: "3post", label: "3 postingan", delta: 0, basis: "order", is_default: true },
          { code: "6post", label: "6 postingan", delta: 150_000, basis: "order" },
          { code: "9post", label: "9 postingan", delta: 300_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "caption", label: "Caption + hashtag", delta: 50_000, basis: "order" },
          { code: "story", label: "Set story (3 slide)", delta: 75_000, basis: "order" },
          { code: "rush", label: "Pengerjaan cepat 1 hari", delta: 75_000, basis: "order" },
        ],
      },
    ],
  },
  kemasan: {
    category: "design",
    pricing_model: "flat",
    min_price: 300_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga desain kemasan. Cetak menyesuaikan bahan dan jumlah.",
    groups: [
      {
        code: "paket",
        label: "Jumlah varian",
        select_type: "single",
        required: true,
        options: [
          { code: "1varian", label: "1 varian", delta: 0, basis: "order", is_default: true },
          { code: "3varian", label: "3 varian", delta: 250_000, basis: "order" },
          { code: "5varian", label: "5 varian", delta: 450_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "mockup", label: "Mockup 3D", delta: 100_000, basis: "order" },
          { code: "dieline", label: "Dieline siap cetak", delta: 75_000, basis: "order" },
          { code: "rush", label: "Pengerjaan cepat 2 hari", delta: 100_000, basis: "order" },
        ],
      },
    ],
  },
  thumbnail: {
    category: "design",
    pricing_model: "flat",
    min_price: 60_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga desain thumbnail. File jadi dikirim via WhatsApp.",
    groups: [
      {
        code: "paket",
        label: "Jumlah thumbnail",
        select_type: "single",
        required: true,
        options: [
          { code: "1buah", label: "1 thumbnail", delta: 0, basis: "order", is_default: true },
          { code: "3buah", label: "3 thumbnail", delta: 100_000, basis: "order" },
          { code: "5buah", label: "5 thumbnail", delta: 180_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "psd", label: "File PSD", delta: 25_000, basis: "order" },
          { code: "rush", label: "Pengerjaan cepat 1 hari", delta: 30_000, basis: "order" },
        ],
      },
    ],
  },
  "spanduk-flexi": {
    category: "print",
    pricing_model: "area",
    min_price: 30_000,
    round_to: 1_000,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per m² (lebar × tinggi). Minimal 1 m², dibulatkan ke Rp1.000.",
    groups: [
      {
        code: "bahan",
        label: "Bahan",
        help: "Bahan menentukan ketahanan di luar ruangan.",
        select_type: "single",
        required: true,
        options: [
          { code: "china280", label: "Flexi China 280gr — standar", delta: 0, basis: "unit", is_default: true },
          { code: "korea440", label: "Flexi Korea 440gr — lebih tebal", delta: 7_000, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        help: "Opsional. Dihitung per m².",
        select_type: "multi",
        required: false,
        options: [
          { code: "mata-ayam", label: "Mata ayam", delta: 2_000, basis: "unit" },
          { code: "selongsong", label: "Selongsong atas–bawah", delta: 3_000, basis: "unit" },
          { code: "talang", label: "Talang keliling", delta: 2_500, basis: "unit" },
        ],
      },
    ],
  },
  "poster-a3": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 5_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per lembar A3+, cetak full color satu sisi.",
    groups: [
      {
        code: "kertas",
        label: "Kertas",
        select_type: "single",
        required: true,
        options: [
          { code: "artpaper150", label: "Art Paper 150gr", delta: 0, basis: "unit", is_default: true },
          { code: "glossy", label: "Glossy 200gr", delta: 2_000, basis: "unit" },
          { code: "artcarton260", label: "Art Carton 260gr", delta: 3_000, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi-doff", label: "Laminasi doff", delta: 3_000, basis: "unit" },
          { code: "laminasi-glossy", label: "Laminasi glossy", delta: 3_000, basis: "unit" },
          { code: "potong", label: "Potong rapi", delta: 1_000, basis: "unit" },
        ],
      },
    ],
  },
  "kartu-nama": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 25_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per box (100 lembar), sudah termasuk box kartu nama.",
    groups: [
      {
        code: "sisi",
        label: "Cetak sisi",
        select_type: "single",
        required: true,
        options: [
          { code: "1sisi", label: "1 sisi", delta: 0, basis: "unit", is_default: true },
          { code: "2sisi", label: "2 sisi", delta: 10_000, basis: "unit" },
        ],
      },
      {
        code: "bahan",
        label: "Bahan",
        select_type: "single",
        required: true,
        options: [
          { code: "ac260", label: "Art Carton 260gr", delta: 0, basis: "unit", is_default: true },
          { code: "ac310", label: "Art Carton 310gr — lebih tebal", delta: 10_000, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi-doff", label: "Laminasi doff", delta: 15_000, basis: "unit" },
          { code: "laminasi-glossy", label: "Laminasi glossy", delta: 15_000, basis: "unit" },
          { code: "spot-uv", label: "Spot UV", delta: 30_000, basis: "unit" },
        ],
      },
    ],
  },
  "stiker-vinyl": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 15_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per lembar A3+, belum termasuk potong custom.",
    groups: [
      {
        code: "bahan",
        label: "Bahan",
        select_type: "single",
        required: true,
        options: [
          { code: "vinyl", label: "Vinyl — tahan air", delta: 0, basis: "unit", is_default: true },
          { code: "transparan", label: "Vinyl transparan", delta: 3_000, basis: "unit" },
          { code: "chrome", label: "Vinyl chrome", delta: 8_000, basis: "unit" },
        ],
      },
      {
        code: "cutting",
        label: "Potong",
        select_type: "single",
        required: true,
        options: [
          { code: "tanpa", label: "Tanpa potong", delta: 0, basis: "unit", is_default: true },
          { code: "kiss", label: "Kiss cut", delta: 5_000, basis: "unit" },
          { code: "die", label: "Die cut sesuai bentuk", delta: 10_000, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi", label: "Laminasi doff/glossy", delta: 3_000, basis: "unit" },
        ],
      },
    ],
  },
  "x-banner": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 85_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per unit X-Banner lengkap dengan rangka. Ukuran menentukan harga dasar.",
    groups: [
      {
        code: "ukuran",
        label: "Ukuran",
        select_type: "single",
        required: true,
        options: [
          { code: "kecil", label: "60 × 160 cm", delta: 0, basis: "unit", is_default: true },
          { code: "sedang", label: "80 × 180 cm", delta: 25_000, basis: "unit" },
          { code: "besar", label: "90 × 200 cm", delta: 40_000, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi", label: "Laminasi anti air", delta: 15_000, basis: "unit" },
          { code: "talang", label: "Talang bawah", delta: 10_000, basis: "unit" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "2sisi", label: "Cetak dua sisi", delta: 30_000, basis: "unit" },
        ],
      },
    ],
  },
  "poster-a2": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 9_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per lembar A2, cetak full color satu sisi.",
    groups: [
      {
        code: "kertas",
        label: "Kertas",
        select_type: "single",
        required: true,
        options: [
          { code: "artpaper150", label: "Art Paper 150gr", delta: 0, basis: "unit", is_default: true },
          { code: "glossy", label: "Glossy 200gr", delta: 2_000, basis: "unit" },
          { code: "artcarton", label: "Art Carton 260gr", delta: 3_500, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi", label: "Laminasi doff/glossy", delta: 4_000, basis: "unit" },
          { code: "potong", label: "Potong rapi", delta: 1_000, basis: "unit" },
        ],
      },
    ],
  },
  "kartu-pos": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 3_500,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per lembar kartu pos, sudah termasuk cetak full color.",
    groups: [
      {
        code: "bahan",
        label: "Bahan",
        select_type: "single",
        required: true,
        options: [
          { code: "ac260", label: "Art Carton 260gr", delta: 0, basis: "unit", is_default: true },
          { code: "ac310", label: "Art Carton 310gr", delta: 800, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi", label: "Laminasi doff", delta: 700, basis: "unit" },
          { code: "spot-uv", label: "Spot UV", delta: 1_200, basis: "unit" },
        ],
      },
    ],
  },
  "stiker-label": {
    category: "print",
    pricing_model: "per_unit",
    min_price: 500,
    round_to: 0,
    min_area_m2: 1,
    requires_file: true,
    price_note: "Harga per lembar label. Minimum cetak 100 lembar per desain.",
    groups: [
      {
        code: "bahan",
        label: "Bahan",
        select_type: "single",
        required: true,
        options: [
          { code: "vinyl", label: "Vinyl tahan air", delta: 0, basis: "unit", is_default: true },
          { code: "kertas", label: "Kertas stiker", delta: 0, basis: "unit" },
          { code: "transparan", label: "Transparan", delta: 200, basis: "unit" },
        ],
      },
      {
        code: "bentuk",
        label: "Bentuk potong",
        select_type: "single",
        required: true,
        options: [
          { code: "kotak", label: "Kotak / persegi", delta: 0, basis: "unit", is_default: true },
          { code: "bundar", label: "Bundar", delta: 100, basis: "unit" },
          { code: "custom", label: "Die cut sesuai bentuk", delta: 250, basis: "unit" },
        ],
      },
      {
        code: "finishing",
        label: "Finishing",
        select_type: "multi",
        required: false,
        options: [
          { code: "laminasi", label: "Laminasi", delta: 150, basis: "unit" },
        ],
      },
    ],
  },
  "foto-produk": {
    category: "design",
    pricing_model: "flat",
    min_price: 150_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga paket foto produk. File mentah bisa dikirim lewat link sebelum sesi.",
    groups: [
      {
        code: "paket",
        label: "Jumlah foto",
        select_type: "single",
        required: true,
        options: [
          { code: "3foto", label: "3 foto", delta: 0, basis: "order", is_default: true },
          { code: "5foto", label: "5 foto", delta: 80_000, basis: "order" },
          { code: "10foto", label: "10 foto", delta: 180_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "model", label: "Model / props", delta: 150_000, basis: "order" },
          { code: "styling", label: "Art direction & styling", delta: 100_000, basis: "order" },
          { code: "rush", label: "Selesai 2 hari", delta: 50_000, basis: "order" },
        ],
      },
    ],
  },
  "desain-web": {
    category: "design",
    pricing_model: "flat",
    min_price: 750_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga desain tampilan. Hosting, domain, dan development tidak termasuk.",
    groups: [
      {
        code: "paket",
        label: "Jumlah halaman",
        select_type: "single",
        required: true,
        options: [
          { code: "landing", label: "Landing page", delta: 0, basis: "order", is_default: true },
          { code: "5halaman", label: "5 halaman", delta: 500_000, basis: "order" },
          { code: "10halaman", label: "10 halaman", delta: 1_000_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "copy", label: "Copywriting", delta: 200_000, basis: "order" },
          { code: "cms", label: "Siap CMS", delta: 300_000, basis: "order" },
          { code: "maintenance", label: "Pemeliharaan 1 bulan", delta: 150_000, basis: "order" },
        ],
      },
    ],
  },
  copywriting: {
    category: "design",
    pricing_model: "flat",
    min_price: 200_000,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Harga per paket jumlah naskah, bukan per kata.",
    groups: [
      {
        code: "paket",
        label: "Jumlah naskah",
        select_type: "single",
        required: true,
        options: [
          { code: "5naskah", label: "5 naskah", delta: 0, basis: "order", is_default: true },
          { code: "10naskah", label: "10 naskah", delta: 150_000, basis: "order" },
          { code: "20naskah", label: "20 naskah", delta: 350_000, basis: "order" },
        ],
      },
      {
        code: "tambahan",
        label: "Tambahan",
        select_type: "multi",
        required: false,
        options: [
          { code: "seo", label: "Riset kata kunci", delta: 100_000, basis: "order" },
          { code: "iklan", label: "Versi iklan (Facebook/Google)", delta: 75_000, basis: "order" },
        ],
      },
    ],
  },
  lain: {
    category: "other",
    pricing_model: "flat",
    min_price: 0,
    round_to: 0,
    min_area_m2: 1,
    requires_file: false,
    price_note: "Kebutuhan khusus. Admin akan menghubungi untuk harga dan jadwal.",
    groups: [],
  },
};

for (const [serviceId, def] of Object.entries(catalog)) {
  const updated = await sql.query(
    `update services
        set category = $1, pricing_model = $2, min_price = $3, round_to = $4,
            min_area_m2 = $5, requires_file = $6, price_note = $7
      where id = $8
      returning id`,
    [
      def.category,
      def.pricing_model,
      def.min_price,
      def.round_to,
      def.min_area_m2,
      def.requires_file,
      def.price_note,
      serviceId,
    ],
  );
  if (!updated[0]) {
    console.warn(`[seed] layanan "${serviceId}" tidak ditemukan, dilewati`);
    continue;
  }

  for (const [groupIndex, group] of def.groups.entries()) {
    const groupRow = await sql.query(
      `insert into service_option_groups
         (service_id, code, label, help, select_type, required, sort, active)
       values ($1, $2, $3, $4, $5, $6, $7, true)
       on conflict (service_id, code) do update
         set label = excluded.label, help = excluded.help,
             select_type = excluded.select_type, required = excluded.required,
             sort = excluded.sort, active = true
       returning id`,
      [serviceId, group.code, group.label, group.help ?? null, group.select_type, group.required, groupIndex + 1],
    );
    const groupId = Number(groupRow[0].id);

    for (const [optionIndex, option] of group.options.entries()) {
      await sql.query(
        `insert into service_options
           (group_id, code, label, description, price_delta, delta_basis,
            is_default, sort, active)
         values ($1, $2, $3, $4, $5, $6, $7, $8, true)
         on conflict (group_id, code) do update
           set label = excluded.label, description = excluded.description,
               price_delta = excluded.price_delta, delta_basis = excluded.delta_basis,
               is_default = excluded.is_default, sort = excluded.sort, active = true`,
        [
          groupId,
          option.code,
          option.label,
          option.description ?? null,
          option.delta,
          option.basis,
          Boolean(option.is_default),
          optionIndex + 1,
        ],
      );
    }
  }
}

const counts = await sql`
  select
    (select count(*)::int from service_option_groups) as groups,
    (select count(*)::int from service_options) as options
`;
console.log(
  `Selesai: ${counts[0].groups} grup opsi, ${counts[0].options} nilai opsi. ` +
    "Harga layanan yang sudah ada tidak diubah.",
);
