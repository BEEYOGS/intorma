// Satu-satunya tempat warna non-monokrom dipakai: penanda status.
export const STATUSES = ["menunggu", "dikerjakan", "revisi", "selesai", "batal"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; color: string; wa: (code: string, name: string) => string }
> = {
  menunggu: {
    label: "Menunggu konfirmasi",
    color: "#d45a4a",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    color: "#d45a4a",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    color: "#d45a4a",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    color: "#d45a4a",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    color: "#d45a4a",
    wa: (c, n) => `Halo ${n}, pesanan ${c} dibatalkan. Kalau ini keliru, balas chat ini.`,
  },
};

export const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s);
