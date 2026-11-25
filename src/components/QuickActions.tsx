"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDollarSign, RotateCcw, Zap } from "lucide-react";
import { quickUpdateOrder } from "@/app/actions";
import { toast } from "@/components/Toast";
import { IconForStatus } from "@/components/StatusIcon";
import { rupiah } from "@/lib/format";
import { NEXT_STATUS, STATUS_META, type Status } from "@/lib/status";

export function QuickActions({
  id,
  code,
  status,
  paid,
  price,
}: {
  id: number;
  code: string;
  status: string;
  paid: boolean;
  price: number | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const current: Status = (Object.keys(NEXT_STATUS) as Status[]).includes(status as Status)
    ? (status as Status)
    : "menunggu";

  async function run(key: string, label: string, kind: "status" | "paid", value: string | boolean) {
    if (busy) return;
    setBusy(key);
    try {
      const res = await quickUpdateOrder({ id, kind, value });
      if (res?.error) {
        toast(res.error, "error");
      } else {
        toast(`${code}: ${label}`, "ok");
        router.refresh();
      }
    } catch {
      toast("Aksi gagal. Coba lagi.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      aria-label={`Aksi cepat ${code}`}
      className="rounded-tag-lg border border-line bg-panel/40 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
          <Zap aria-hidden className="size-3.5" /> Aksi cepat
        </p>
        <span className="mono text-[11px] text-mute">{code}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {NEXT_STATUS[current].map((next) => {
          const danger = next === "batal";
          const key = `status-${next}`;
          return (
            <button
              key={next}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run(key, `jadi ${STATUS_META[next].short}`, "status", next)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] border px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-50 ${
                danger
                  ? "border-danger/35 bg-danger/[0.05] text-danger hover:bg-danger/[0.1]"
                  : "border-line bg-white/[0.03] text-ink/70 hover:border-[var(--border-2)] hover:bg-white/[0.07] hover:text-ink"
              }`}
            >
              {busy === key ? (
                <span aria-hidden className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" />
              ) : (
                <IconForStatus status={next} className="size-3.5" />
              )}
              {STATUS_META[next].short}
            </button>
          );
        })}

        <button
          type="button"
          disabled={Boolean(busy) || price === null}
          onClick={() =>
            run(
              "paid",
              paid ? "belum dibayar" : "lunas",
              "paid",
              !paid,
            )
          }
          title={price === null ? "Harga belum disepakati" : undefined}
          className={`inline-flex min-h-10 items-center gap-2 rounded-[var(--radius)] border px-3 text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            paid
              ? "border-line bg-transparent text-mute hover:text-ink"
              : "border-[var(--border-2)] bg-white/[0.09] text-ink hover:bg-white/[0.14]"
          }`}
        >
          {busy === "paid" ? (
            <span aria-hidden className="size-3.5 animate-spin rounded-full border border-current border-t-transparent" />
          ) : paid ? (
            <RotateCcw aria-hidden className="size-3.5" />
          ) : (
            <CircleDollarSign aria-hidden className="size-3.5" />
          )}
          {paid ? "Batalkan lunas" : "Tandai lunas"}
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-mute">
        {price === null
          ? "Isi harga lewat editor penuh dulu sebelum menandai pembayaran."
          : `Total ${rupiah(price)} • Aksi cepat tidak mengirim pesan WhatsApp.`}
      </p>
    </section>
  );
}
