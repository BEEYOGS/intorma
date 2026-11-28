"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { quickUpdateOrder } from "@/app/actions";
import { STATUS_META, STATUSES, isStatus, type Status } from "@/lib/status";
import { rupiah, tanggalJam } from "@/lib/format";
import Link from "next/link";

type Order = {
  id: number;
  code: string;
  name: string;
  status: string;
  price: number | null;
  paid: boolean;
  service: string | null;
  deadline_at: string | null;
  deadline: string | null;
  created_at: string | Date;
};

const COLUMNS: Status[] = ["menunggu", "dikerjakan", "revisi", "selesai", "batal"];

function deadlineInfo(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const diff = date.getTime() - Date.now();
  const overdue = diff < 0;
  const soon = !overdue && diff <= 6 * 3600_000;
  const status = overdue ? "OVERDUE" : soon ? "DUE SOON (< 6 jam)" : "ON TRACK";
  return { label: `${status} · ${tanggalJam(date)}`, overdue, soon };
}

export function ProductionBoard({ orders, returnTo }: { orders: Order[]; returnTo: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function move(id: number, status: Status) {
    startTransition(async () => {
      const result = await quickUpdateOrder({ id, kind: "status", value: status });
      if (result?.error) toast(result.error, "error");
      else {
        toast("Status diperbarui.", "ok");
        router.refresh();
      }
    });
  }

  function togglePaid(id: number, paid: boolean, price: number | null) {
    if (price == null && !paid) {
      toast("Harga belum disepakati.", "error");
      return;
    }
    startTransition(async () => {
      const result = await quickUpdateOrder({ id, kind: "paid", value: !paid });
      if (result?.error) toast(result.error, "error");
      else {
        toast("Pembayaran diperbarui.", "ok");
        router.refresh();
      }
    });
  }

  const grouped = COLUMNS.map((status) => ({
    status,
    meta: STATUS_META[status],
    items: orders.filter((order) => (isStatus(order.status) ? order.status : "menunggu") === status),
  }));

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {grouped.map((column) => (
        <section key={column.status} className="rounded-tag-lg border border-line bg-panel/40 p-3">
          <header className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: column.meta.color }} aria-hidden />
              <h3 className="text-sm font-semibold">{column.meta.label}</h3>
            </div>
            <span className="mono rounded-tag-sm border border-line px-2 py-0.5 text-xs text-mute">
              {column.items.length}
            </span>
          </header>

          <div className="space-y-3">
            {column.items.length === 0 && (
              <p className="rounded-tag-sm border border-dashed border-line px-3 py-6 text-center text-xs text-mute">
                Kosong
              </p>
            )}
            {column.items.map((order) => {
              const st = (isStatus(order.status) ? order.status : "menunggu") as Status;
              const dl = deadlineInfo(order.deadline_at ?? order.deadline);
              return (
                <article key={order.id} className="rounded-tag-sm border border-line bg-panel/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/lacak/${order.code}`} className="mono text-xs font-semibold text-ink hover:underline">
                      {order.code}
                    </Link>
                    <span className="text-xs text-mute">{order.paid ? "Lunas" : order.price != null ? "Belum bayar" : "Harga tbd"}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug">{order.name}</p>
                  <p className="mt-0.5 text-xs text-mute">{order.service ?? "Layanan"}</p>
                  {dl && (
                    <p className={`mt-2 text-xs font-medium ${dl.overdue ? "text-danger" : dl.soon ? "text-accent" : "text-mute"}`}>
                      {dl.label}
                    </p>
                  )}
                  <p className="mt-2 mono text-xs text-mute">
                    {order.price != null ? rupiah(Number(order.price)) : "—"}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      defaultValue={st}
                      disabled={pending}
                      onChange={(event) => {
                        const next = event.target.value;
                        if (isStatus(next) && next !== st) move(order.id, next);
                      }}
                      className="field min-h-12 flex-1 text-sm sm:min-h-10"
                      aria-label={`Ubah status ${order.code}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_META[s].short}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={pending || (order.price == null && !order.paid)}
                      onClick={() => togglePaid(order.id, order.paid, order.price)}
                      className="btn btn-ghost min-h-12 px-3 text-sm sm:min-h-10"
                      aria-label={order.paid ? "Tandai belum dibayar" : "Tandai lunas"}
                    >
                      {order.paid ? "Batalkan lunas" : "Tandai lunas"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
