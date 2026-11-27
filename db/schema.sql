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
  -- Nama layanan disimpan supaya riwayat tetap terbaca bila layanan dihapus.
  service_label text,
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
alter table orders add column if not exists service_label text;
update orders o set service_label = s.name from services s where s.id = o.service_id and o.service_label is null;
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

-- Catatan internal hanya untuk admin, tidak pernah dikirim ke klien.
alter table orders add column if not exists internal_note text;

-- Deadline lengkap dengan jam. `deadline` (date) tetap dipertahankan untuk data lama.
alter table orders add column if not exists deadline_at timestamptz;

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
  ('payment_note', 'Transfer sesuai total, lalu konfirmasi lewat WhatsApp.'),
  ('reminder_enabled', '1'),
  ('admin_digest_enabled', '1')
on conflict (key) do nothing;

-- Kampanye repeat order otomatis untuk pelanggan yang pesanannya sudah selesai.
insert into promo_codes (code, type, value, min_order, max_discount, usage_limit)
values ('REORDER10', 'percent', 10, 100000, 100000, 500)
on conflict (code) do nothing;

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

-- Seluruh file pelanggan disimpan di Google Drive. Neon hanya metadata.
create table if not exists uploads (
  id serial primary key,
  code text not null unique,
  file_name text not null,
  mime text not null,
  size bigint not null,
  storage text not null default 'drive',
  drive_file_id text,
  drive_web_link text,
  customer_id int references customers(id) on delete set null,
  order_id int references orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table uploads alter column size type bigint;
alter table uploads add column if not exists storage text not null default 'drive';
alter table uploads add column if not exists drive_file_id text;
alter table uploads add column if not exists drive_web_link text;
alter table uploads add column if not exists customer_id int references customers(id) on delete set null;
alter table uploads add column if not exists order_id int references orders(id) on delete set null;
create index if not exists uploads_customer_idx on uploads(customer_id, created_at desc);
create unique index if not exists uploads_drive_file_unique
  on uploads(drive_file_id) where drive_file_id is not null;

-- Ulasan klien. Dikirim dari halaman lacak saat pesanan selesai, dimoderasi admin.
create table if not exists reviews (
  id serial primary key,
  order_id int references orders(id) on delete set null,
  customer_id int references customers(id) on delete set null,
  name text not null,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reviews_approved_idx on reviews (approved, created_at desc);

-- Kode promo. Dipakai di checkout untuk diskon persen/nominal.
create table if not exists promo_codes (
  id serial primary key,
  code text unique not null,
  type text not null check (type in ('percent', 'fixed')),
  value numeric(10,2) not null,
  min_order int not null default 0,
  max_discount int,
  usage_limit int,
  used_count int not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table orders add column if not exists promo_code text;
alter table orders add column if not exists discount_amount int not null default 0;

-- Jejak aksi admin. audit() menulis ke tabel ini; halaman /admin/audit membacanya.
create table if not exists audit_log (
  id bigserial primary key,
  actor text not null default 'admin',
  action text not null,
  entity text not null,
  entity_id text,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on audit_log(created_at desc);

-- Kode pesanan harian: satu statement UPSERT memberi nomor urut yang atomik.
-- last_seq sudah diisi dari orders lama supaya deploy tidak mengulang kode.
create table if not exists order_code_counters (
  day char(6) primary key,
  last_seq int not null default 0
);
insert into order_code_counters (day, last_seq)
select substr(code, 5, 6), max(substr(code, 11)::int)
from orders
where code ~ '^INT-[0-9]{9,}$'
group by 1
on conflict (day) do update
  set last_seq = greatest(order_code_counters.last_seq, excluded.last_seq);

-- Akun admin dengan password terpisah. Password ADMIN_PASSWORD di environment
-- tetap diterima sebagai cadangan, jadi mengelola akun tidak bisa mengunci diri.
create table if not exists admin_accounts (
  id serial primary key,
  username text unique not null,
  label text not null default '',
  password_hash text not null,
  active boolean not null default true,
  role text not null default 'operator',
  token_version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table admin_accounts add column if not exists active boolean not null default true;
alter table admin_accounts add column if not exists role text not null default 'operator';
alter table admin_accounts add column if not exists token_version int not null default 0;
alter table admin_accounts add column if not exists updated_at timestamptz not null default now();

-- Rate limit bersama untuk server action & endpoint publik (tidak bisa dilewati lewat path lain).
create table if not exists auth_rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Idempotency submit order: dua submit paralel tidak membuat dua pesanan.
alter table orders add column if not exists client_request_id uuid;
create unique index if not exists orders_client_request_id_key on orders(client_request_id) where client_request_id is not null;

-- Kode pesanan mudah ditebak, jadi halaman publik butuh token pribadi.
-- Token dibuat aplikasi saat order dan dikirim lewat WhatsApp/tautan nota.
alter table orders add column if not exists access_token text;
create unique index if not exists orders_access_token_key on orders(access_token) where access_token is not null;
update orders set access_token = md5(gen_random_uuid()::text || gen_random_uuid()::text || id::text || code)
where access_token is null or btrim(access_token) = '';

-- Satu tagihan Midtrans aktif per pesanan.
update payments set status = 'failed'
where provider = 'midtrans' and status = 'pending'
  and id not in (
    select max(id) from payments where provider = 'midtrans' and status = 'pending' group by order_id
  );
create unique index if not exists payments_one_pending_midtrans
  on payments(order_id) where provider = 'midtrans' and status = 'pending';

-- Penghapusan akun terakhir dicegah di database, termasuk saat dua request bersamaan.
create or replace function guard_last_admin_account() returns trigger as $$
begin perform pg_advisory_xact_lock(73119927); if (select count(*) from admin_accounts) <= 1 then raise exception 'Tidak bisa menghapus satu-satunya akun admin database'; end if; return old; end $$ language plpgsql;

drop trigger if exists admin_accounts_last_guard on admin_accounts;
create trigger admin_accounts_last_guard
  before delete on admin_accounts
  for each row execute function guard_last_admin_account();
