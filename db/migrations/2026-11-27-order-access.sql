-- Akses halaman publik pesanan memakai token acak, bukan kode harian yang bisa ditebak.
-- Sudah juga tercermin di db/schema.sql supaya npm run db:migrate menerapkannya.

-- STATEMENT
alter table orders add column if not exists access_token text;

-- STATEMENT
create unique index if not exists orders_access_token_key on orders(access_token) where access_token is not null;

-- STATEMENT
update orders set access_token = md5(gen_random_uuid()::text || gen_random_uuid()::text || id::text || code)
where access_token is null or btrim(access_token) = '';
