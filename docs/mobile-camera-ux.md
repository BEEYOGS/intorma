# Panduan UX mobile: kamera & unggah foto

Riset singkat (28 Nov 2026) untuk menetapkan logika tampilan mobile in.tarma. Sumber yang dipakai adalah dokumentasi primer/platform, bukan blog tampilan.

## Sumber

| Sumber | Pokok yang dipakai |
| --- | --- |
| [Android — Request runtime permissions](https://developer.android.com/training/permissions/requesting) | Minta izin **saat konteks fitur dipakai**, bukan saat startup; berikan tombol batal pada UI penjelasan; jika ditolak, **degradasi anggun** dan jangan memaksa pengguna mengubah keputusan; uji kondisi izin diberikan/dicabut. |
| [Android — App permissions best practices](https://developer.android.com/training/permissions/usage-notes) | Banyak kebutuhan foto bisa dipenuhi lewat *picker*/intent sistem tanpa izin kamera penuh; minimalkan izin; pengguna lebih menerima izin yang diminta setelah menekan tombol yang jelas. |
| [MDN — getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) | Hanya di **secure context** (HTTPS); izin selalu diminta; promise **boleh tidak pernah settle** jika pengguna mengabaikan prompt; `facingMode` sebaiknya `ideal`; **stop track dulu** sebelum mengganti kamera; indikator kamera harus tetap terlihat. |
| [MDN — Taking still photos](https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Taking_still_photos) | Pola umum: tombol izin → `<video>` → canvas → `<img>` pratinjau → konfirmasi. |
| [W3C WCAG 2.2 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) & [(Enhanced)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html) | Minimum 24×24 CSS px (AA), 44×44 CSS px (AAA). |
| [web.dev — Accessible tap targets](https://web.dev/articles/accessible-tap-targets) | Rekomendasi praktis: **48×48 px** + jarak **8 px**; deteksi layar sentuh dengan `any-pointer: coarse`, bukan menebak lebar layar. |
| [Capacitor Camera v8](https://capacitorjs.com/docs/apis/camera) | Di wrapper native, kamera/galeri sistem bisa dipakai lewat plugin; `CameraResultType.Uri` + `quality` menghindari membawa file mentah berlebih. |

## Pola yang diadaptasi

1. **Permission primer, bukan permission popup.**
   Layar pertama berisi panduan + contoh baik/buruk + alasan singkat. Tidak ada `getUserMedia()` sebelum pengguna menekan tombol kamera. Ini mengikuti pola "jelaskan dulu, minta izin kemudian" dari Android dan contoh `Allow camera → Capture → Preview` dari MDN.

2. **Galeri sebagai jalur aman.**
   `Pilih dari galeri` selalu tersedia dan tidak memerlukan izin kamera. Setelah izin ditolak atau kamera tidak tersedia, galeri menjadi **aksi utama**; tombol kamera menjadi opsi sekunder yang hanya dipilih jika pengguna memang ingin mencoba lagi. Tidak ada pengulangan prompt otomatis.

3. **Konfirmasi dua langkah.**
   `Kamera → jepret → pratinjau → Gunakan foto / Ambil ulang / Batal`. Foto tidak langsung dikirim setelah jepret. Ini memberi kesempatan memeriksa ketajaman dan kesesuaian dengan kotak bidik.

4. **Kotak bidik 4:3 + grid.**
   Panduan "seluruh objek masuk kotak, cahaya cukup, tahan HP sebentar" ditampilkan di layar dan di card contoh. Grid ringan membantu komposisi tanpa menambah elemen ramai.

5. **Privasi sebagai default.**
   JPG dihasilkan ulang lewat canvas, EXIF/GPS dibuang. `audio: false`. Kamera dimatikan (`track.stop()`) saat tutup, ganti kamera, komponen unmount, atau halaman ke background. Jika izin dicabut saat kamera aktif, viewfinder tidak boleh menampilkan frame beku.

6. **Target sentuh & safe area.**
   Semua kontrol ≥48 px (shutter 72 px), jarak antar kontrol ≥8 px, `env(safe-area-inset-top/bottom)`, `100dvh`, `overflow-x: clip`, input ≥16 px. Fokus berpindah ke aksi utama pada tiap tahap dan diumumkan lewat live region.

## State yang wajib diuji

| State | Harapan |
| --- | --- |
| Pertama buka | Panduan + contoh tampil; kamera **tidak** menyala; tidak ada prompt izin. |
| Tekan "Ambil foto" | Prompt izin muncul; tombol berubah "Membuka kamera…"; ada batal. |
| Izin ditolak | Kartu "Kamera tidak diaktifkan"; galeri jadi tombol utama; tidak ada nag otomatis. |
| Prompt diabaikan | Timeout 9 detik; kamera tetap mati; galeri tersedia. |
| Kamera dipakai aplikasi lain | Pesan spesifik; galeri tersedia. |
| Kamera aktif lalu tab ke background | Track dihentikan; saat kembali pengguna melihat panduan, bukan frame lama. |
| Izin dicabut dari pengaturan | Track `ended` → pesan "+ galeri", bukan viewfinder beku. |
| Preview | Foto bisa diperiksa; "Gunakan foto" fokus; "Ambil ulang" mengulang kamera. |
| Layar 320 px | Tanpa overflow horizontal, tombol ≥48 px, tidak ada teks terpotong. |

## Catatan implementasi

- Logika utama: `src/components/CameraCapture.tsx`.
- Integrasi: `src/components/OrderForm.tsx` dan `src/components/FileLibrary.tsx`.
- CSP/Permissions-Policy: `next.config.mjs` (`camera=(self)`, `media-src 'self' blob:`).
- Native: `android/app/src/main/AndroidManifest.xml` (izin `CAMERA` opsional).
- Jika kelak ingin memakai kamera sistem penuh di wrapper native, pertimbangkan `@capacitor/camera` agar tidak perlu izin kamera in-app; ini perubahan terpisah dan perlu bump versi APK.
