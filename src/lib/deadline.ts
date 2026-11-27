/** Deadline memakai hari kalender WIB, bukan hitungan 24 jam yang bisa
 * berubah-ubah mengikuti jam saat form dibuka. Dipakai form dan server supaya
 * tanggal yang terlihat valid tidak pernah ditolak saat submit. */

const wibFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function wibToday(now = new Date()): string {
  const parts = wibFormatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function minDeadlineDate(days: number, now = new Date()): string {
  const base = new Date(`${wibToday(now)}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + Math.max(0, Math.floor(days)));
  return base.toISOString().slice(0, 10);
}

export function deadlineToUtc(dateISO: string, timeHHMM: string): Date {
  return new Date(`${dateISO}T${timeHHMM}:00+07:00`);
}
