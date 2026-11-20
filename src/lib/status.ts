export type Status = "menunggu" | "dikerjakan" | "selesi" | "batal";

export const STATUS_META: Record<Status, { label: string; tone?: string; wa: (code: string, name: string) => string }> = {
  menunggu: { label: "Menunggu", wa: (c, n) => `Halo ${n}, pesan ${c} sudah terdaftar.` },
  dikerjakan: { label: "In progress", wa: (c, n) => `Halo ${n}, pesan ${c} sedang dikerjakan.` },
  selesi: { label: "Done", wa: (c, n) => `Halo ${n}, pesan ${c} selesai.` },
  batal: { label: "Cancelled", wa: (c, n) => `Halo ${n}, pesan ${c} dibatalkan.` },
};

export const isStatus = (s: string): s is Status => Object.prototype.hasOwnProperty.call(STATUS_META, s);
