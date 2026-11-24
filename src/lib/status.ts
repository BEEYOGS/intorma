// Warna status sengaja dibedakan supaya tahap pesanan mudah dibaca sekilas.
// Merah hanya dipakai untuk "batal"; warna lain memakai padanan yang lebih tenang.
export const STATUSES = ["menunggu", "dikerjakan", "revisi", "selesai", "batal"] as const;
export type Status = (typeof STATUSES)[number];
export type StatusIconName = "clock" | "brush" | "rotate" | "check" | "ban";

export const STATUS_META: Record<
  Status,
  {
    label: string;
    short: string;
    color: string;
    soft: string;
    icon: StatusIconName;
    wa: (code: string, name: string) => string;
  }
> = {
  menunggu: {
    label: "Menunggu konfirmasi",
    short: "Menunggu",
    color: "#d8a13a",
    soft: "rgba(216, 161, 58, 0.14)",
    icon: "clock",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    short: "Dikerjakan",
    color: "#5b9bd5",
    soft: "rgba(91, 155, 213, 0.14)",
    icon: "brush",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    short: "Revisi",
    color: "#a986e8",
    soft: "rgba(169, 134, 232, 0.14)",
    icon: "rotate",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    short: "Selesai",
    color: "#4fae86",
    soft: "rgba(79, 174, 134, 0.14)",
    icon: "check",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    short: "Batal",
    color: "#d45a4a",
    soft: "rgba(212, 90, 74, 0.14)",
    icon: "ban",
    wa: (c, n) => `Halo ${n}, pesanan ${c} dibatalkan. Kalau ini keliru, balas chat ini.`,
  },
};

export const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s);

export const asStatus = (s: string): Status => (isStatus(s) ? s : "menunggu");
