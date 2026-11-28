export const rupiah = (n: number | null | undefined) =>
  n == null ? "-" : "Rp" + new Intl.NumberFormat("id-ID").format(n);

export const tanggal = (d: string | Date) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

export const jam = (d: string | Date) =>
  new Date(d).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

/** Tanggal + jam lengkap dalam zona WIB, dipakai deadline dan pesan WhatsApp. */
export const tanggalJam = (d: string | Date | null | undefined) =>
  d == null
    ? "-"
    : new Date(d).toLocaleString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      });

/**
 * Deadline wajib tanggal + jam WIB. Data lama hanya menyimpan tanggal;
 * untuk itu dipakai akhir hari WIB (23:59), bukan UTC midnight.
 */
export function deadlineWib(
  deadlineAt: string | Date | null | undefined,
  deadline: string | Date | null | undefined,
): Date | null {
  if (deadlineAt) {
    const explicit = new Date(deadlineAt);
    return Number.isNaN(explicit.getTime()) ? null : explicit;
  }
  if (!deadline) return null;
  const raw = typeof deadline === "string" ? deadline : deadline.toISOString();
  const [year, month, day] = raw.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  // WIB = UTC+7, jadi 23:59 lokal sama dengan 16:59 UTC.
  return new Date(Date.UTC(year, month - 1, day, 16, 59, 0));
}

export const deadlineLabel = (
  deadlineAt: string | Date | null | undefined,
  deadline: string | Date | null | undefined,
) => {
  const date = deadlineWib(deadlineAt, deadline);
  return date ? jam(date) : "Fleksibel";
};

/** Tanggal hari ini di WIB, format YYYY-MM-DD. Dipakai kunci idempoten cron. */
export const tanggalHariIni = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** 0812..., 812..., +62812... -> 62812... (kosong kalau tidak valid) */
export function normalizeWA(input: string): string {
  let n = input.replace(/\D/g, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return /^62\d{8,13}$/.test(n) ? n : "";
}
