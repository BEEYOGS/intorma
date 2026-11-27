import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rupiah, tanggal, tanggalJam } from "@/lib/format";
import { STATUS_META, asStatus } from "@/lib/status";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analitik", robots: { index: false } };

type RangeKey = "7" | "30" | "90" | "all";

function rangeDays(range: RangeKey): number | null {
  if (range === "all") return null;
  return Number(range);
}

function cutoff(range: RangeKey): Date | null {
  const d = rangeDays(range);
  if (!d) return null;
  const x = new Date();
  x.setDate(x.getDate() - d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function AnalitikPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const params = await searchParams;
  const range = (["7", "30", "90", "all"].includes(params.range ?? "")
    ? (params.range as RangeKey)
    : "30") as RangeKey;
  const c = cutoff(range);
  const cParam = c ? c.toISOString() : null;

  const where = cParam ? "where created_at >= $1" : "";
  const paramsArr = cParam ? [cParam] : [];

  const [summary, byDay, byService, byStatus, overdue, unpaidOld, growth, aging, topCustomers] = await Promise.all([
    sql.query(
      `select
        count(*)::int as total,
        count(*) filter (where paid)::int as paid_count,
        coalesce(sum(price) filter (where paid), 0)::int as revenue,
        count(*) filter (where price is not null and not paid and status <> 'batal')::int as unpaid,
        count(*) filter (where status = 'selesai')::int as done,
        count(*) filter (where status = 'batal')::int as cancelled,
        coalesce(avg(price) filter (where price is not null), 0)::int as avg_price
      from orders ${where}`,
      paramsArr,
    ),
    sql.query(
      `select date_trunc('day', created_at)::date as day, count(*)::int as n, coalesce(sum(price),0)::int as revenue
       from orders ${where}
       group by 1 order by 1`,
      paramsArr,
    ),
    sql.query(
      `select coalesce(service_label, 'Lainnya') as service, count(*)::int as n, coalesce(sum(price),0)::int as revenue
       from orders ${where}
       group by 1 order by revenue desc, n desc
       limit 8`,
      paramsArr,
    ),
    sql.query(
      `select status, count(*)::int as n from orders ${where} group by status`,
      paramsArr,
    ),
    sql.query(
      `select code, name, deadline, deadline_at, status from orders
       where coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') is not null
         and coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') < now()
         and status not in ('selesai','batal')
       order by coalesce(deadline_at, (deadline + time '23:59') at time zone 'Asia/Jakarta') asc limit 8`,
    ),
    sql.query(
      `select code, name, price, created_at from orders
       where price is not null and not paid and status <> 'batal'
         and created_at < now() - interval '7 days'
       order by created_at asc limit 8`,
    ),
    sql.query(
      `select
         count(*) filter (where status = 'selesai' and deadline_at is not null and updated_at <= deadline_at)::int as on_time,
         count(*) filter (where status = 'selesai' and deadline_at is not null)::int as with_deadline,
         coalesce(avg(extract(epoch from (updated_at - created_at)) / 86400) filter (where status = 'selesai'), 0)::numeric(10,1) as avg_turnaround,
         count(distinct coalesce(customer_id::text, wa))::int as customers
       from orders ${where}`,
      paramsArr,
    ),
    sql.query(
      `select
         count(*) filter (where created_at > now() - interval '7 days')::int as d0_7,
         count(*) filter (where created_at <= now() - interval '7 days' and created_at > now() - interval '14 days')::int as d8_14,
         count(*) filter (where created_at <= now() - interval '14 days')::int as d15_plus
       from orders
       where price is not null and not paid and status <> 'batal'`,
    ),
    sql.query(
      `select name, wa, count(*)::int as orders, coalesce(sum(price),0)::int as revenue
       from orders ${where}
       group by name, wa
       order by revenue desc, orders desc
       limit 6`,
      paramsArr,
    ),
  ]);

  const s = (summary[0] ?? {}) as Record<string, number>;
  const total = Number(s.total ?? 0);
  const paidCount = Number(s.paid_count ?? 0);
  const revenue = Number(s.revenue ?? 0);
  const unpaid = Number(s.unpaid ?? 0);
  const done = Number(s.done ?? 0);
  const cancelled = Number(s.cancelled ?? 0);
  const avgPrice = Number(s.avg_price ?? 0);

  const g = (growth[0] ?? {}) as Record<string, number | string>;
  const onTime = Number(g.on_time ?? 0);
  const withDeadline = Number(g.with_deadline ?? 0);
  const avgTurnaround = Number(g.avg_turnaround ?? 0);
  const customerCount = Number(g.customers ?? 0);
  const newCustomers = customerCount;
  const onTimeRate = withDeadline > 0 ? Math.round((onTime / withDeadline) * 100) : 0;
  const paymentRate = total > 0 ? Math.round((paidCount / Math.max(1, total)) * 100) : 0;

  const a = (aging[0] ?? {}) as Record<string, number>;
  const aging07 = Number(a.d0_7 ?? 0);
  const aging814 = Number(a.d8_14 ?? 0);
  const aging15 = Number(a.d15_plus ?? 0);

  const maxDay = Math.max(1, ...byDay.map((r) => Number(r.n)));
  const maxSvc = Math.max(1, ...byService.map((r) => Number(r.revenue)));

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "7", label: "7 hari" },
    { key: "30", label: "30 hari" },
    { key: "90", label: "90 hari" },
    { key: "all", label: "Semua" },
  ];

  return (
    <AdminShell active="analytics">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analitik</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">Performa pesanan</h1>
          <p className="mt-2 text-sm text-mute">Ringkasan, tren, dan pengingat operasional.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Rentang waktu" className="flex flex-wrap gap-2">
            {ranges.map((r) => (
              <a
                key={r.key}
                href={`/admin/analitik?range=${r.key}`}
                aria-current={range === r.key ? "page" : undefined}
                className={`inline-flex min-h-10 items-center rounded-tag-sm border px-3 text-xs font-semibold transition-colors ${
                  range === r.key
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-line text-ink/60 hover:border-accent/30 hover:text-ink"
                }`}
              >
                {r.label}
              </a>
            ))}
          </nav>
          <a
            href={`/api/admin/export/orders?range=${range}`}
            className="btn btn-outline min-h-10 px-3 text-xs"
          >
            <Download aria-hidden className="size-3.5" /> Export CSV
          </a>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total pesanan" value={total} hint={`${paidCount} lunas`} />
        <Kpi label="Pendapatan" value={rupiah(revenue)} hint={`rata-rata ${rupiah(avgPrice)}`} />
        <Kpi label="Selesai" value={done} hint={`${cancelled} batal`} />
        <Kpi label="Belum dibayar" value={unpaid} hint="harga sudah disepakati" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pesanan per hari</h2>
            <span className="text-xs text-mute">{byDay.length} hari</span>
          </div>
          {byDay.length === 0 ? (
            <p className="mt-6 text-sm text-mute">Belum ada data.</p>
          ) : (
            <div className="mt-6 flex items-end gap-1.5 overflow-x-auto pb-2">
              {byDay.map((r) => {
                const n = Number(r.n);
                const h = Math.max(4, Math.round((n / maxDay) * 96));
                return (
                  <div key={String(r.day)} className="flex min-w-[2rem] flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-accent/70"
                      style={{ height: `${h}px` }}
                      title={`${tanggal(r.day)}: ${n} pesanan`}
                    />
                    <span className="text-[11px] text-mute">{String(r.day).slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <h2 className="text-sm font-semibold">Pendapatan per layanan</h2>
          {byService.length === 0 ? (
            <p className="mt-6 text-sm text-mute">Belum ada data.</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {byService.map((r) => {
                const rev = Number(r.revenue);
                const w = Math.max(2, Math.round((rev / maxSvc) * 100));
                return (
                  <li key={String(r.service)}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{String(r.service)}</span>
                      <span className="tabular-nums text-mute">{rupiah(rev)}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-panel">
                      <div className="h-2 rounded-full bg-accent/70" style={{ width: `${w}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-mute">{Number(r.n)} pesanan</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <h2 className="text-sm font-semibold">Pertumbuhan & operasional</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-tag-sm border border-line bg-panel/60 p-4">
              <p className="text-xs text-mute">Konversi pembayaran</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{paymentRate}%</p>
              <p className="mt-1 text-xs text-mute">{paidCount} dari {total} pesanan</p>
            </div>
            <div className="rounded-tag-sm border border-line bg-panel/60 p-4">
              <p className="text-xs text-mute">Tepat waktu</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{onTimeRate}%</p>
              <p className="mt-1 text-xs text-mute">{onTime} dari {withDeadline} dengan deadline</p>
            </div>
            <div className="rounded-tag-sm border border-line bg-panel/60 p-4">
              <p className="text-xs text-mute">Rata-rata pengerjaan</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{avgTurnaround.toFixed(1)} hari</p>
              <p className="mt-1 text-xs text-mute">dari dibuat ke selesai</p>
            </div>
            <div className="rounded-tag-sm border border-line bg-panel/60 p-4">
              <p className="text-xs text-mute">Pelanggan</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{customerCount}</p>
              <p className="mt-1 text-xs text-mute">{newCustomers} baru di rentang ini</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mute">Aging piutang</p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-panel">
              {aging07 + aging814 + aging15 > 0 ? (
                <>
                  <div className="bg-accent/70" style={{ width: `${(aging07 / (aging07 + aging814 + aging15)) * 100}%` }} />
                  <div className="bg-[var(--quiet)]" style={{ width: `${(aging814 / (aging07 + aging814 + aging15)) * 100}%` }} />
                  <div className="bg-danger/70" style={{ width: `${(aging15 / (aging07 + aging814 + aging15)) * 100}%` }} />
                </>
              ) : (
                <div className="w-full bg-panel" />
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-mute">
              <span><span className="mr-1 inline-block size-2 rounded-full bg-accent/70" />0–7 hari: {aging07}</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--quiet)]" />8–14 hari: {aging814}</span>
              <span><span className="mr-1 inline-block size-2 rounded-full bg-danger/70" />&gt;14 hari: {aging15}</span>
            </div>
          </div>
        </section>

        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <h2 className="text-sm font-semibold">Pelanggan teratas</h2>
          {topCustomers.length === 0 ? (
            <p className="mt-4 text-sm text-mute">Belum ada data.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {topCustomers.map((r, index) => (
                <li key={`${r.name}-${index}`} className="flex items-center justify-between gap-3 rounded-tag-sm border border-line px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{String(r.name)}</p>
                    <p className="text-xs text-mute">{Number(r.orders)} pesanan</p>
                  </div>
                  <span className="mono shrink-0 text-sm font-semibold">{rupiah(Number(r.revenue))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <h2 className="text-sm font-semibold">Distribusi status</h2>
          <ul className="mt-4 space-y-2">
            {byStatus.map((r) => (
              <li key={String(r.status)} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: statusColor(String(r.status)) }} />
                  {statusLabel(String(r.status))}
                </span>
                <span className="tabular-nums font-semibold">{Number(r.n)}</span>
              </li>
            ))}
            {byStatus.length === 0 && <li className="text-sm text-mute">Belum ada data.</li>}
          </ul>
        </section>

        <section className="rounded-tag-lg border border-line bg-panel/40 p-5">
          <h2 className="text-sm font-semibold">Pengingat operasional</h2>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Terlambat (deadline lewat)</p>
              {overdue.length === 0 ? (
                <p className="mt-2 text-sm text-mute">Tidak ada.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {overdue.map((r) => (
                    <li key={String(r.code)} className="flex items-center justify-between text-sm">
                      <a href={`/admin?open=${r.code}`} className="font-mono text-xs font-semibold hover:text-accent">
                        {String(r.code)}
                      </a>
                      <span className="text-xs text-mute">
                        {String(r.name)} ·{" "}
                        {r.deadline_at ? tanggalJam(String(r.deadline_at)) : tanggal(String(r.deadline))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-mute">Belum dibayar &gt; 7 hari</p>
              {unpaidOld.length === 0 ? (
                <p className="mt-2 text-sm text-mute">Tidak ada.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {unpaidOld.map((r) => (
                    <li key={String(r.code)} className="flex items-center justify-between text-sm">
                      <a href={`/admin?open=${r.code}`} className="font-mono text-xs font-semibold hover:text-accent">
                        {String(r.code)}
                      </a>
                      <span className="text-xs text-mute">{String(r.name)} · {rupiah(Number(r.price))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-tag-lg border border-line bg-panel/50 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    menunggu: "Menunggu",
    dikerjakan: "Dikerjakan",
    revisi: "Revisi",
    selesai: "Selesai",
    batal: "Batal",
  };
  return map[s] ?? s;
}

function statusColor(s: string): string {
  return STATUS_META[asStatus(s)].color;
}
