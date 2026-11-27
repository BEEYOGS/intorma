import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { ChevronRight, MessageCircle, Search, UsersRound, X } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { normalizeWA, rupiah, tanggal } from "@/lib/format";
import { STATUS_META, isStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelanggan", robots: { index: false } };

type Customer = {
  wa: string;
  name: string;
  orders: number;
  paid_orders: number;
  spent: number;
  due: number;
  last_at: string;
  first_at: string;
};

type HistoryRow = {
  wa: string;
  code: string;
  status: string;
  price: number | null;
  paid: boolean;
  created_at: string;
  service: string | null;
};

export default async function Pelanggan({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const q = (await searchParams).q?.trim().slice(0, 80) ?? "";

  const conditions = ["o.wa is not null", "o.wa <> ''"];
  const values: string[] = [];
  if (q) {
    values.push(`%${q}%`);
    const p = `$${values.length}`;
    conditions.push(`(o.name ilike ${p} or o.wa ilike ${p} or o.code ilike ${p})`);
  }
  const where = conditions.join(" and ");

  const [customers, historyRows] = await Promise.all([
    sql.query(
      `select o.wa,
         max(o.name) as name,
         count(*)::int as orders,
         count(*) filter (where o.paid)::int as paid_orders,
         coalesce(sum(o.price) filter (where o.paid), 0)::int as spent,
         coalesce(sum(o.price) filter (where not o.paid and o.status <> 'batal'), 0)::int as due,
         max(o.created_at) as last_at,
         min(o.created_at) as first_at
       from orders o where ${where}
       group by o.wa
       order by last_at desc
       limit 200`,
      values,
    ),
    sql.query(
      `select o.wa, o.code, o.status, o.price, o.paid, o.created_at,
         coalesce(v.name, o.service_label) as service
       from orders o left join services v on v.id = o.service_id
       where ${where}
       order by o.created_at desc
       limit 1000`,
      values,
    ),
  ]);

  const list = customers as Customer[];
  const history = new Map<string, HistoryRow[]>();
  for (const row of historyRows as HistoryRow[]) {
    const key = String(row.wa);
    const items = history.get(key) ?? [];
    if (items.length < 20) items.push(row);
    history.set(key, items);
  }

  const repeat = list.filter((c) => Number(c.orders) > 1).length;
  const spentTotal = list.reduce((sum, c) => sum + Number(c.spent ?? 0), 0);
  const dueTotal = list.reduce((sum, c) => sum + Number(c.due ?? 0), 0);

  return (
    <AdminShell active="customers">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="eyebrow">Admin · CRM</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">Pelanggan</h1>
          <p className="mt-2 text-sm text-mute">
            Riwayat pesanan per nomor WhatsApp, total belanja, dan piutang yang masih menggantung.
          </p>
        </div>
        <div className="rounded-tag-sm border border-line bg-panel/50 px-4 py-2.5 text-sm">
          <span className="text-mute">Repeat order </span>
          <span className="font-semibold tabular-nums">{repeat}</span>
          <span className="text-mute"> dari {list.length} pelanggan</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat label="Pelanggan tercatat" value={String(list.length)} hint="nomor WhatsApp unik" icon={<UsersRound className="size-4" />} />
        <MiniStat label="Omzet terkumpul" value={rupiah(spentTotal)} hint="dari pesanan lunas" />
        <MiniStat label="Piutang pelanggan" value={rupiah(dueTotal)} hint="belum diterima" />
      </div>

      <form action="/admin/pelanggan" method="get" className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="cari-pelanggan" className="sr-only">Cari pelanggan</label>
        <input
          id="cari-pelanggan"
          name="q"
          defaultValue={q}
          placeholder="Cari nama, WhatsApp, atau kode pesanan…"
          className="field min-h-10 sm:max-w-sm"
          autoComplete="off"
        />
        <button type="submit" className="btn btn-outline min-h-10 px-4 text-sm">
          <Search aria-hidden className="size-4" /> Cari
        </button>
        {q && (
          <Link href="/admin/pelanggan" className="btn btn-ghost min-h-10 px-4 text-sm">
            <X aria-hidden className="size-4" /> Reset
          </Link>
        )}
      </form>

      <p className="mt-6 text-sm text-mute">
        {list.length === 0
          ? q ? `Tidak ada pelanggan untuk “${q}”.` : "Belum ada pelanggan tercatat."
          : `Menampilkan ${list.length} pelanggan${q ? ` untuk “${q}”` : ""}.`}
      </p>

      {list.length === 0 ? (
        <div className="mt-4 rounded-tag-lg border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Belum ada data pelanggan.</p>
          <p className="mt-2 text-sm text-mute">Data muncul otomatis setelah ada pesanan masuk.</p>
          <Link href="/order" className="btn btn-outline mt-5 min-h-10 px-4 text-sm">
            Buka halaman pesan
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {list.map((c, index) => {
            const wa = normalizeWA(String(c.wa));
            const items = history.get(String(c.wa)) ?? [];
            const orders = Number(c.orders ?? 0);
            const spent = Number(c.spent ?? 0);
            const due = Number(c.due ?? 0);
            return (
              <li key={`${c.wa}-${index}`} className="rounded-tag-lg border border-line bg-panel/40">
                <details className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 p-4 transition-colors hover:bg-white/[0.02]">
                    <span className="grid size-9 shrink-0 place-items-center rounded-tag-sm border border-line bg-white/[0.03] text-[var(--text-2)]">
                      <UsersRound aria-hidden className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{c.name || "Tanpa nama"}</span>
                      <span className="mono block text-xs text-mute">{c.wa}</span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-tag-sm border border-line px-2.5 py-1 text-mute">
                        {orders} pesanan
                      </span>
                      {spent > 0 && (
                        <span className="rounded-tag-sm border border-line px-2.5 py-1 tabular-nums">
                          {rupiah(spent)}
                        </span>
                      )}
                      {due > 0 && (
                        <span className="rounded-tag-sm border border-danger/30 bg-danger/[0.05] px-2.5 py-1 font-semibold tabular-nums text-danger">
                          Piutang {rupiah(due)}
                        </span>
                      )}
                    </span>
                    <ChevronRight aria-hidden className="size-4 shrink-0 text-ink/30 transition-transform group-open:rotate-90" />
                  </summary>

                  <div className="grid gap-5 border-t border-line px-4 pb-5 pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-5">
                    <div>
                      <p className="eyebrow">Riwayat pesanan</p>
                      {items.length === 0 ? (
                        <p className="mt-2 text-sm text-mute">Riwayat tidak tersedia.</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-line">
                          {items.map((o) => {
                            const st = isStatus(o.status) ? o.status : "menunggu";
                            return (
                              <li key={o.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                                <span aria-hidden className="status-dot shrink-0" style={{ background: STATUS_META[st].color }} />
                                <Link
                                  href={`/admin?open=${encodeURIComponent(o.code)}`}
                                  className="mono font-semibold underline decoration-line underline-offset-4 hover:decoration-ink"
                                >
                                  {o.code}
                                </Link>
                                <span className="min-w-0 flex-1 truncate text-mute">{o.service ?? "—"}</span>
                                <span className="text-xs text-mute">{tanggal(o.created_at)}</span>
                                <span className="tabular-nums">{o.price == null ? "—" : rupiah(Number(o.price))}</span>
                                <span className="text-xs text-mute">{o.paid ? "Lunas" : "Belum bayar"}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      <p className="mt-3 text-xs text-mute">
                        Pelanggan sejak {tanggal(c.first_at)} · terakhir {tanggal(c.last_at)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:w-44">
                      {wa ? (
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-wa min-h-10 justify-center px-4 text-sm"
                        >
                          <MessageCircle aria-hidden className="size-4" /> Chat WhatsApp
                        </a>
                      ) : (
                        <span className="btn btn-ghost min-h-10 cursor-not-allowed justify-center px-4 text-sm opacity-50">
                          Nomor tidak tersedia
                        </span>
                      )}
                      <Link
                        href={`/admin?q=${encodeURIComponent(String(c.wa))}`}
                        className="btn btn-outline min-h-10 justify-center px-4 text-sm"
                      >
                        Lihat di pesanan
                      </Link>
                    </div>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}

function MiniStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-tag-lg border border-line bg-panel/50 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}
