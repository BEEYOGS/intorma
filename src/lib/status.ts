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
    color: "#a1a1aa",
    soft: "rgba(161, 161, 170, 0.13)",
    icon: "clock",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    short: "Dikerjakan",
    color: "#3291ff",
    soft: "rgba(0, 112, 243, 0.14)",
    icon: "brush",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    short: "Revisi",
    color: "#c7c7c7",
    soft: "rgba(199, 199, 199, 0.14)",
    icon: "rotate",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    short: "Selesai",
    color: "#ffffff",
    soft: "rgba(255, 255, 255, 0.10)",
    icon: "check",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    short: "Batal",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.14)",
    icon: "ban",
    wa: (c, n) => `Halo ${n}, pesanan ${c} dibatalkan. Kalau ini keliru, balas chat ini.`,
  },
};

export const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s);

export const asStatus = (s: string): Status => (isStatus(s) ? s : "menunggu");

/** Pilihan status lanjutan untuk aksi cepat. Editor penuh tetap boleh memilih semua status. */
export const NEXT_STATUS: Record<Status, readonly Status[]> = {
  menunggu: ["dikerjakan", "batal"],
  dikerjakan: ["selesai", "revisi"],
  revisi: ["dikerjakan", "selesai"],
  selesai: ["dikerjakan"],
  batal: ["menunggu"],
};
