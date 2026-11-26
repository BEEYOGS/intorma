// Monokrom: status dibedakan lewat ikon dan tingkat kecerahan, bukan warna.
// Urutan terang mengikuti progres: menunggu redup, selesai paling terang.
// Merah hanya dipakai untuk "batal". printColor dipakai di kertas putih (nota/PDF).
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
    printColor: string;
    icon: StatusIconName;
    wa: (code: string, name: string) => string;
  }
> = {
  menunggu: {
    label: "Menunggu konfirmasi",
    short: "Menunggu",
    color: "#a1a1a1",
    soft: "rgba(255, 255, 255, 0.06)",
    printColor: "#525252",
    icon: "clock",
    wa: (c, n) => `Halo ${n}, pesananmu ${c} sudah kami terima. Kami cek brief-nya dulu, lalu kabari soal harga dan jadwal.`,
  },
  dikerjakan: {
    label: "Sedang dikerjakan",
    short: "Dikerjakan",
    color: "#e4e4e4",
    soft: "rgba(255, 255, 255, 0.08)",
    printColor: "#181818",
    icon: "brush",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sekarang sedang dikerjakan.`,
  },
  revisi: {
    label: "Revisi",
    short: "Revisi",
    color: "#c7c7c7",
    soft: "rgba(255, 255, 255, 0.07)",
    printColor: "#3f3f3f",
    icon: "rotate",
    wa: (c, n) => `Halo ${n}, pesanan ${c} masuk tahap revisi. Kami lanjutkan sesuai catatanmu.`,
  },
  selesai: {
    label: "Selesai",
    short: "Selesai",
    color: "#ffffff",
    soft: "rgba(255, 255, 255, 0.10)",
    printColor: "#090909",
    icon: "check",
    wa: (c, n) => `Halo ${n}, pesanan ${c} sudah selesai. File final dikirim lewat chat ini.`,
  },
  batal: {
    label: "Dibatalkan",
    short: "Batal",
    color: "#ef4444",
    soft: "rgba(239, 68, 68, 0.14)",
    printColor: "#b91c1c",
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
