-- Simpan nama layanan pada order agar riwayat tetap terbaca setelah layanan dihapus.
alter table orders add column if not exists service_label text;
update orders o
set service_label = s.name
from services s
where s.id = o.service_id and o.service_label is null;
