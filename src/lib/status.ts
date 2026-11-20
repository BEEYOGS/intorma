// Status monochrome: nada abu dari ramp merek, dibedakan pola (solid/dashed/strike).
export const STATUSES = ["menunggu", "dikerjakan", "revisi", "selesai", "batal"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_META: Record<
  Status,
  { label: string; color: string; tone?: "dashed" | "solid" | "strike"; wa: (code: string, name: string) => string }
> = {
  menunggu: {
    label: "Menunggu konfirmasi",
    color: "#8a8d8e",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    color: "#c6c8c9",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    color: "#f5f7f9",
    tone: "dashed",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    color: "#ffffff",
    tone: "solid",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    color: "#6d7275",
    tone: "strike",
    wa: (c, n) => `Halo ${n}, pesanan ${c} dibatalkan. Kalau ini keliru, balas chat ini.`,
  },
};

export const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s);