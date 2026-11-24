-- Semua file upload berada di Google Drive; Neon tidak menyimpan byte file.
-- Jalankan SETELAH scripts/migrate-uploads-to-drive.ts berhasil memindahkan
-- semua baris lama yang storage = 'db'.

-- Samakan label baris lama yang sudah punya file Drive.
update uploads set storage = 'drive'
where storage = 'db' and drive_file_id is not null;

-- Hapus kolom blob. Ini yang membuat database jadi jauh lebih ringan.
alter table uploads drop column if exists data;

-- Pengaman: tidak boleh ada lagi baris yang ditandai tersimpan di database.
alter table uploads drop constraint if exists uploads_storage_drive_check;
alter table uploads add constraint uploads_storage_drive_check check (storage = 'drive');
