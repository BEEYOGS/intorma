// Warna status diambil dari palet tinta proses C/M/Y/K ruang cetak.
export const STATUSES = ["menunggu", "dikerjakan", "revisi", "selesai", "batal"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; color: string; wa: (code: string, name: string) => string }
> = {
  menunggu: {
    label: "Menunggu konfirmasi",
    color: "#ffd23f",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    color: "#2ee6ff",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    color: "#ff3d8e",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    color: "#3fe08c",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    color: "#ff5c5c",
    wa: (c, n) => `Halo ${n}, pesanan ${c} dibatalkan. Kalau ini keliru, balas chat ini.`,
  },
};

export const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s);
