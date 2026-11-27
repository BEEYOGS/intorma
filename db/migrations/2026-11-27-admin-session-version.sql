-- Sesi admin bisa dicabut: token_version dinaikkan saat password diubah/akun dinonaktifkan.
alter table admin_accounts add column if not exists active boolean not null default true;
alter table admin_accounts add column if not exists role text not null default 'operator';
alter table admin_accounts add column if not exists token_version int not null default 0;
alter table admin_accounts add column if not exists updated_at timestamptz not null default now();
