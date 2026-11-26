export type ReminderOrder = {
  code: string;
  status: string;
  price: number | null;
  paid: boolean;
  deadlineAt: string | Date | null;
  ageDays: number;
};

export type ReminderPlan =
  | { kind: "deadline"; key: string }
  | { kind: "unpaid"; key: string; stage: 2 | 7 | 14 };

/**
 * Aturan pengingat sengaja dibatasi supaya kuota Fonnte tidak boros:
 * - deadline H-2 / lewat: maksimal satu pesan per pesanan per hari;
 * - belum dibayar: hanya pada hari ke-2, 7, dan 14 sejak pesanan dibuat.
 * Deadline diprioritaskan agar satu pesanan tidak menerima dua pengingat sehari.
 */
export function planReminder(
  order: ReminderOrder,
  today: string,
  now = Date.now(),
): ReminderPlan | null {
  const active = order.status !== "selesai" && order.status !== "batal";
  const deadline = order.deadlineAt ? new Date(order.deadlineAt).getTime() : null;
  const deadlineSoon = deadline !== null && Number.isFinite(deadline) && deadline <= now + 48 * 3600_000;

  if (active && deadlineSoon) {
    return { kind: "deadline", key: `reminder-${order.code}-${today}` };
  }

  if (order.price !== null && !order.paid && order.status !== "batal" && order.ageDays >= 2) {
    const stage = order.ageDays >= 14 ? 14 : order.ageDays >= 7 ? 7 : 2;
    return { kind: "unpaid", key: `unpaid-${order.code}-${stage}`, stage };
  }

  return null;
}
