create table if not exists services (
  id text primary key,
  name text not null,
  blurb text not null,
  price_from int not null default 0,
  days int not null default 3,
  sort int not null default 0,
  active boolean not null default true,
  pricing_mode text not null default 'flat',
  unit_label text not null default '',
  min_qty numeric(10,2) not null default 1,
  max_qty numeric(10,2) not null default 10000,
  category text not null default 'design',
  pricing_model text,
  min_price int not null default 0,
  round_to int not null default 0,
  min_area_m2 numeric(10,2) not null default 1,
  requires_file boolean not null default false,
  price_note text not null default ''
);

create table if not exists orders (
  id serial primary key,
  code text unique not null,
  name text not null,
  wa text not null,
  service_id text references services(id),
  brief text not null,
  ref_link text,
  deadline date,
  status text not null default 'menunggu',
  price int,
  note text,
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- untuk database yang dibuat sebelum kolom pembayaran ada
alter table orders add column if not exists paid boolean not null default false;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists qty numeric(10,2);
alter table orders add column if not exists unit_rate numeric(10,2);

-- snapshot konfigurasi self-service (opsi terpilih + rincian harga)
alter table orders add column if not exists width_cm numeric(10,2);
alter table orders add column if not exists height_cm numeric(10,2);
alter table orders add column if not exists options jsonb;
alter table orders add column if not exists subtotal int;
alter table orders add column if not exists file_url text;
alter table orders add column if not exists payment_method text not null default 'transfer';
alter table orders add column if not exists payment_status text not null default 'unpaid';

-- untuk database yang dibuat sebelum harga per item ada
alter table services add column if not exists pricing_mode text not null default 'flat';
alter table services add column if not exists unit_label text not null default '';
alter table services add column if not exists min_qty numeric(10,2) not null default 1;
alter table services add column if not exists max_qty numeric(10,2) not null default 10000;

-- katalog self-service: kategori, model harga, minimum, pembulatan, file
alter table services add column if not exists category text not null default 'design';
alter table services add column if not exists pricing_model text;
alter table services add column if not exists min_price int not null default 0;
alter table services add column if not exists round_to int not null default 0;
alter table services add column if not exists min_area_m2 numeric(10,2) not null default 1;
alter table services add column if not exists requires_file boolean not null default false;
alter table services add column if not exists price_note text not null default '';

-- Grup opsi per layanan: bahan, ukuran, finishing, paket, tambahan.
create table if not exists service_option_groups (
  id serial primary key,
  service_id text not null references services(id) on delete cascade,
  code text not null,
  label text not null,
  help text,
  select_type text not null default 'single',
  required boolean not null default true,
  sort int not null default 0,
  active boolean not null default true,
  unique (service_id, code)
);

-- Nilai opsi. price_delta dalam rupiah; delta_basis:
--   unit  = dikali jumlah/area (tergantung model harga)
--   order = sekali per pesanan
create table if not exists service_options (
  id serial primary key,
  group_id int not null references service_option_groups(id) on delete cascade,
  code text not null,
  label text not null,
  description text,
  price_delta int not null default 0,
  delta_basis text not null default 'unit',
  is_default boolean not null default false,
  sort int not null default 0,
  active boolean not null default true,
  unique (group_id, code)
);

create index if not exists service_option_groups_service_idx
  on service_option_groups(service_id, sort);
create index if not exists service_options_group_idx
  on service_options(group_id, sort);

create table if not exists order_events (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status, created_at desc);

-- Catatan pembayaran. Untuk transfer manual diisi saat order dibuat lalu
-- diperbarui admin. Struktur ini siap dipakai gateway (Midtrans/Xendit) nanti.
create table if not exists payments (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  provider text not null default 'manual',
  method text not null default 'transfer',
  amount int not null,
  status text not null default 'pending',
  reference text,
  proof_url text,
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_order_idx on payments(order_id, created_at desc);

create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- Antrean pesan WhatsApp. Vercel tidak bisa menjangkau OpenWA yang berjalan di
-- komputer lokal, jadi pesan disimpan di sini lalu dikirim oleh `npm run wa:agent`.
-- Trigger pengaman untuk order baru ada di db/wa-trigger.sql (npm run db:wa-trigger).
create table if not exists wa_outbox (
  id bigserial primary key,
  to_number text not null,
  content text not null,
  status text not null default 'pending',
  attempts int not null default 0,
  last_error text,
  idempotency_key text,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table wa_outbox add column if not exists idempotency_key text;

-- Kunci idempoten: pesan yang sama tidak dikirim dua kali. Wajib ada karena
-- trigger db/wa-trigger.sql memakai ON CONFLICT pada kolom ini.
create unique index if not exists wa_outbox_idempotency_idx
  on wa_outbox (idempotency_key)
  where idempotency_key is not null;

create index if not exists wa_outbox_pending_idx on wa_outbox(status, next_attempt_at);

insert into app_settings (key, value) values
  ('payment_enabled', '1'),
  ('bank_name', 'BCA'),
  ('bank_account', '8171700213'),
  ('bank_holder', 'Yogi'),
  ('payment_note', 'Transfer sesuai total, lalu konfirmasi lewat WhatsApp.')
on conflict (key) do nothing;

insert into services (id, name, blurb, price_from, days, sort, pricing_mode, unit_label, min_qty, max_qty) values
  ('logo', 'Logo dan identitas', 'Logo, palet warna, dan panduan pemakaian dasar.', 350000, 5, 1, 'flat', '', 1, 10000),
  ('poster', 'Poster dan banner', 'Desain poster acara, spanduk, atau materi cetak lain.', 120000, 2, 2, 'flat', '', 1, 10000),
  ('feed', 'Feed Instagram', 'Satu set postingan dengan gaya yang seragam.', 200000, 3, 3, 'flat', '', 1, 10000),
  ('kemasan', 'Kemasan dan label', 'Label produk, stiker, dan desain kemasan.', 300000, 4, 4, 'flat', '', 1, 10000),
  ('thumbnail', 'Thumbnail dan cover', 'Thumbnail video, cover podcast, atau sampul.', 60000, 1, 5, 'flat', '', 1, 10000),
  ('spanduk-flexi', 'Spanduk Flexi', 'Cetak banner outdoor. Pilih bahan dan finishing; harga per m².', 25000, 2, 6, 'per_unit', 'meter', 1, 1000),
  ('poster-a3', 'Cetak Poster A3+', 'Cetak poster A3+ full color, art paper 150gr. Harga per lembar.', 5000, 1, 7, 'per_unit', 'lembar', 1, 5000),
  ('kartu-nama', 'Cetak Kartu Nama', 'Kartu nama art carton, 1 box isi 100 lembar. Harga per box.', 25000, 2, 8, 'per_unit', 'box', 1, 100),
  ('stiker-vinyl', 'Cetak Stiker Vinyl A3+', 'Stiker vinyl tahan air, A3+. Harga per lembar.', 15000, 2, 9, 'per_unit', 'lembar', 1, 5000),
  ('lain', 'Belum tahu butuh apa', 'Ceritakan saja kebutuhanmu, nanti kami arahkan.', 0, 3, 10, 'flat', '', 1, 10000),
  ('x-banner', 'X-Banner', 'Banner portable dengan kaki X, cocok untuk pameran dan promo.', 85000, 2, 11, 'per_unit', 'pcs', 1, 100),
  ('poster-a2', 'Cetak Poster A2', 'Poster A2 full color untuk display toko dan acara.', 9000, 1, 12, 'per_unit', 'lembar', 1, 5000),
  ('kartu-pos', 'Kartu Pos', 'Kartu pos cetak full color, cocok untuk undangan dan merchandising.', 3500, 2, 13, 'per_unit', 'lembar', 1, 5000),
  ('stiker-label', 'Stiker Label Produk', 'Stiker label kemasan dalam various ukuran, siap tempel.', 500, 2, 14, 'per_unit', 'lembar', 1, 10000),
  ('foto-produk', 'Foto Produk', 'Pemotretan dan editing foto produk untuk katalog dan marketplace.', 150000, 3, 15, 'flat', '', 1, 10000),
  ('desain-web', 'Desain Website', 'Desain tampilan website/landing page beserta panduan handoff.', 750000, 7, 16, 'flat', '', 1, 10000),
  ('copywriting', 'Copywriting', 'Naskah promosi untuk website, iklan, dan media sosial.', 200000, 3, 17, 'flat', '', 1, 10000)
on conflict (id) do nothing;

-- Akun pelanggan (portal self-service). Terpisah dari admin.
create table if not exists customers (
  id serial primary key,
  name text not null,
  wa text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table orders add column if not exists customer_id int references customers(id) on delete set null;
create index if not exists orders_customer_idx on orders(customer_id, created_at desc);

-- File yang diunggah pelanggan disimpan sementara di database. Untuk produksi
-- dengan file besar, gunakan storage eksternal (S3/Supabase) dan simpan URL-nya.
create table if not exists uploads (
  id serial primary key,
  code text not null unique,
  file_name text not null,
  mime text not null,
  size int not null,
  data bytea not null,
  storage text not null default 'db',
  drive_file_id text,
  customer_id int references customers(id) on delete set null,
  order_id int references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table uploads add column if not exists storage text not null default 'db';
alter table uploads add column if not exists drive_file_id text;
alter table uploads add column if not exists customer_id int references customers(id) on delete set null;
alter table uploads add column if not exists order_id int references orders(id) on delete set null;
create index if not exists uploads_customer_idx on uploads(customer_id, created_at desc);
