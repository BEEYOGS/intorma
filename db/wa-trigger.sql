-- Pengaman notifikasi WhatsApp untuk order baru.
--
-- Aplikasi yang live di Vercel bisa saja belum/tidak menulis ke wa_outbox.
-- Trigger ini memastikan setiap insert order tetap membuat dua pesan antrean:
--   1. konfirmasi ke nomor pelanggan
--   2. ringkasan pesanan ke nomor admin
--
-- Aktif hanya kalau app_settings.wa_trigger_enabled = '1'.
-- Jalankan dengan: npm run db:wa-trigger

-- STATEMENT
create unique index if not exists wa_outbox_idempotency_idx
  on wa_outbox (idempotency_key)
  where idempotency_key is not null;

-- STATEMENT
create or replace function public.enqueue_wa_for_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  enabled text;
  site text;
  admin_raw text;
  admin_wa text;
  cust_wa text;
  cust_display text;
  svc_name text;
  unit_text text;
  total_text text;
  qty_text text;
  detail_text text;
  summary_text text;
  file_text text;
  upload_code text;
  drive_text text;
  cust_text text;
  admin_text text;
begin
  select value into enabled from app_settings where key = 'wa_trigger_enabled';
  if coalesce(enabled, '0') <> '1' then
    return new;
  end if;

  select value into site from app_settings where key = 'site_url';
  site := coalesce(nullif(btrim(site), ''), 'https://intorma-psi.vercel.app');
  site := regexp_replace(site, '/+$', '');

  select value into admin_raw from app_settings where key = 'admin_wa';
  admin_wa := regexp_replace(coalesce(admin_raw, ''), '\D', '', 'g');
  if admin_wa like '0%' then
    admin_wa := '62' || substr(admin_wa, 2);
  elsif admin_wa like '8%' then
    admin_wa := '62' || admin_wa;
  end if;
  if admin_wa !~ '^62[0-9]{8,13}$' then
    admin_wa := null;
  end if;

  cust_wa := regexp_replace(coalesce(new.wa, ''), '\D', '', 'g');
  if cust_wa like '0%' then
    cust_wa := '62' || substr(cust_wa, 2);
  elsif cust_wa like '8%' then
    cust_wa := '62' || cust_wa;
  end if;
  if cust_wa ~ '^62[0-9]{8,13}$' then
    cust_display := cust_wa;
  else
    -- Nomor pelanggan tidak valid: tetap beri tahu admin, tapi jangan antre
    -- pesan ke nomor yang salah.
    cust_display := coalesce(nullif(btrim(new.wa), ''), '(kosong)');
    cust_wa := '';
  end if;

  select s.name, coalesce(s.unit_label, '')
    into svc_name, unit_text
    from services s
   where s.id = new.service_id;
  svc_name := coalesce(svc_name, new.service_id, 'Layanan');

  total_text := case
    when new.price is not null and new.price > 0
      then 'Rp' || replace(to_char(new.price, 'FM999,999,999,999'), ',', '.')
    else 'menunggu konfirmasi'
  end;

  if new.qty is not null and new.unit_rate is not null and coalesce(unit_text, '') <> '' then
    qty_text := format(
      '%s %s x Rp%s',
      trim_scale(new.qty),
      unit_text,
      replace(to_char(new.unit_rate, 'FM999,999,999,999'), ',', '.')
    );
  else
    qty_text := null;
  end if;

  -- Pesanan self-service menyimpan rincian ukuran/opsi sebagai snapshot JSON.
  summary_text := nullif(btrim(coalesce(new.options->>'summary', '')), '');
  file_text := nullif(btrim(coalesce(new.file_url, '')), '');
  detail_text := coalesce(summary_text, qty_text);

  -- File yang diunggah lewat aplikasi punya baris di uploads. Ambil link Drive
  -- aslinya supaya admin bisa membuka file langsung di folder produksi.
  if file_text like '%/api/upload/%' then
    upload_code := substring(file_text from '/api/upload/([^?]+)');
    if upload_code is not null then
      select u.drive_web_link into drive_text from uploads u where u.code = upload_code;
    end if;
  end if;

  if new.price is not null and new.price > 0 then
    cust_text := 'Halo ' || new.name || ', pesananmu ' || new.code || ' sudah kami terima.';
    if detail_text is not null then
      cust_text := cust_text || chr(10) || chr(10) || detail_text;
    end if;
    cust_text := cust_text || chr(10) || chr(10) || 'Total: ' || total_text;
    cust_text := cust_text || chr(10) || 'Silakan transfer sesuai instruksi di halaman pesanan, lalu kirim bukti transfer ke chat ini.';
  else
    cust_text := 'Halo ' || new.name || ', pesananmu ' || new.code || ' sudah kami terima.';
    if detail_text is not null then
      cust_text := cust_text || chr(10) || chr(10) || detail_text;
    end if;
    cust_text := cust_text || chr(10) || chr(10) || 'Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.';
  end if;
  cust_text := cust_text || chr(10) || chr(10) || 'Pantau di: ' || site || '/lacak/' || new.code || '?t=' || coalesce(new.access_token, '');

  if cust_wa <> '' then
    insert into wa_outbox (to_number, content, idempotency_key)
    values (cust_wa, cust_text, 'order-' || new.id || '-customer')
    on conflict (idempotency_key) where idempotency_key is not null do nothing;
  end if;

  if admin_wa is not null then
    admin_text := 'Pesanan baru ' || new.code || chr(10) ||
      new.name || ' (' || cust_display || ')' || chr(10) ||
      svc_name;
    if detail_text is not null then
      admin_text := admin_text || chr(10) || detail_text;
    end if;
    admin_text := admin_text || chr(10) || 'Total: ' || total_text;
    if file_text is not null then
      admin_text := admin_text || chr(10) || 'File: ' || file_text;
    end if;
    if drive_text is not null then
      admin_text := admin_text || chr(10) || 'Drive: ' || drive_text;
    end if;
    admin_text := admin_text || chr(10) || chr(10) || new.brief;
    insert into wa_outbox (to_number, content, idempotency_key)
    values (admin_wa, admin_text, 'order-' || new.id || '-admin')
    on conflict (idempotency_key) where idempotency_key is not null do nothing;
  end if;

  return new;
end;
$$;

-- STATEMENT
drop trigger if exists orders_enqueue_wa on orders;

-- STATEMENT
create trigger orders_enqueue_wa
after insert on orders
for each row execute function public.enqueue_wa_for_new_order();

-- STATEMENT
insert into app_settings (key, value) values
  ('site_url', 'https://intorma-psi.vercel.app'),
  ('wa_trigger_enabled', '1')
on conflict (key) do update set value = excluded.value, updated_at = now();

