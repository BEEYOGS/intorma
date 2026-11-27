-- Akun admin dikelola dari /admin/akun. Password env tetap jadi cadangan.
create table if not exists admin_accounts (
  id serial primary key,
  username text unique not null,
  label text not null default '',
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
