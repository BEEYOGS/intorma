create table if not exists services (
  id text primary key,
  name text not null,
  blurb text not null,
  price_from int not null default 0,
  days int not null default 3,
  sort int not null default 0,
  active boolean not null default true
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

create table if not exists order_events (
  id serial primary key,
  order_id int not null references orders(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status, created_at desc);

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

insert into services (id, name, blurb, price_from, days, sort) values
  ('logo', 'Logo dan identitas', 'Logo, palet warna, dan panduan pemakaian dasar.', 350000, 5, 1),
  ('poster', 'Poster dan banner', 'Poster acara, spanduk, atau materi cetak lain.', 120000, 2, 2),
  ('feed', 'Feed Instagram', 'Satu set postingan dengan gaya yang seragam.', 200000, 3, 3),
  ('kemasan', 'Kemasan dan label', 'Label produk, stiker, dan desain kemasan.', 300000, 4, 4),
  ('thumbnail', 'Thumbnail dan cover', 'Thumbnail video, cover podcast, atau sampul.', 60000, 1, 5),
  ('lain', 'Belum tahu butuh apa', 'Ceritakan saja kebutuhanmu, nanti kami arahkan.', 0, 3, 6)
on conflict (id) do nothing;
