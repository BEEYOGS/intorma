-- Rate limit bersama untuk server action & endpoint publik (tidak bisa dilewati lewat path lain).
create table if not exists auth_rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Idempotency submit order: dua submit paralel tidak membuat dua pesanan.
alter table orders add column if not exists client_request_id uuid;
create unique index if not exists orders_client_request_id_key on orders(client_request_id) where client_request_id is not null;

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
