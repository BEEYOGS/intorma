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
  max_qty numeric(10,2) not null default 10000
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

create table if not exists order_events (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

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
  ('spanduk-flexi', 'Spanduk Flexi China 280gr', 'Cetak banner outdoor. Harga per meter, finishing bisa dibicarakan.', 25000, 2, 6, 'per_unit', 'meter', 1, 1000),
  ('poster-a3', 'Cetak Poster A3+', 'Cetak poster A3+ full color, art paper 150gr. Harga per lembar.', 5000, 1, 7, 'per_unit', 'lembar', 1, 5000),
  ('kartu-nama', 'Cetak Kartu Nama', 'Kartu nama art carton, 1 box isi 100 lembar. Harga per box.', 25000, 2, 8, 'per_unit', 'box', 1, 100),
  ('stiker-vinyl', 'Cetak Stiker Vinyl A3+', 'Stiker vinyl tahan air, A3+. Harga per lembar.', 15000, 2, 9, 'per_unit', 'lembar', 1, 5000),
  ('lain', 'Belum tahu butuh apa', 'Ceritakan saja kebutuhanmu, nanti kami arahkan.', 0, 3, 10, 'flat', '', 1, 10000)
on conflict (id) do nothing;
