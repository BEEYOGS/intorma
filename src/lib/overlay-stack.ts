/**
 * Tumpukan overlay yang sedang terbuka.
 *
 * Dipakai supaya tombol back Android menutup sheet/dialog paling atas lebih dulu
 * sebelum melakukan history.back() atau keluar dari aplikasi. Modul ini sengaja
 * tanpa React agar bisa dipanggil dari listener Capacitor di luar pohon komponen.
 */
export type OverlayRegistration = {
  id: string;
  close: () => void;
};

const stack: OverlayRegistration[] = [];

/** Daftarkan overlay saat terbuka. Kembalikan fungsi unregister untuk useEffect. */
export function registerOverlay(registration: OverlayRegistration): () => void {
  stack.push(registration);
  return () => {
    const index = stack.lastIndexOf(registration);
    if (index >= 0) stack.splice(index, 1);
  };
}

/**
 * Tutup overlay teratas. Mengembalikan true bila ada overlay yang ditutup,
 * sehingga pemanggil bisa membatalkan navigasi back bawaan.
 */
export function closeTopOverlay(): boolean {
  const top = stack.pop();
  if (!top) return false;
  top.close();
  return true;
}
