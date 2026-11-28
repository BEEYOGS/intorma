import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { Search, UsersRound, X } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { CustomerList, type CustomerHistoryRow, type CustomerRow } from "@/components/CustomerList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pelanggan", robots: { index: false } };

type Customer = CustomerRow;
type HistoryRow = CustomerHistoryRow;

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
        <div className="mt-4">
          <CustomerList customers={list} history={Object.fromEntries(history)} />
        </div>
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
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink/60">
        {icon} {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}
