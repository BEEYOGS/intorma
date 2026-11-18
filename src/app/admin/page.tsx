import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/Chrome";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";
import { OrderEditor } from "@/components/OrderEditor";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rupiah, tanggal } from "@/lib/format";
import { STATUSES, STATUS_META, isStatus, type Status } from "@/lib/status";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

type Params = {
  s?: string;
  p?: string;
  q?: string;
  open?: string;
  saved?: string;
  deleted?: string;
};

function buildReturn(filter: string | null, unpaidOnly: boolean, q: string): string {
  const params = new URLSearchParams();
  if (filter) params.set("s", filter);
  if (unpaidOnly) params.set("p", "belum");
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin?${query}` : "/admin";
}

export default async function Admin({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const params = await searchParams;
  const filter = params.s && isStatus(params.s) ? params.s : null;
  const unpaidOnly = params.p === "belum" && !filter;
  const q = (params.q ?? "").trim().slice(0, 80);
  const openCode = params.open?.toUpperCase() ?? null;
  const saved = params.saved === "1";
  const deleted = params.deleted?.toUpperCase() ?? null;
  const returnTo = buildReturn(filter, unpaidOnly, q);

  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (filter) {
    values.push(filter);
    conditions.push(`o.status = $${values.length}`);
  }
  if (unpaidOnly) {
    conditions.push(`o.price is not null and not o.paid and o.status <> 'batal'`);
  }
  if (q) {
    values.push(`%${q}%`);
    const placeholder = `$${values.length}`;
    conditions.push(`(o.code ilike ${placeholder} or o.name ilike ${placeholder} or o.wa ilike ${placeholder})`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";
  const from = `from orders o left join services v on v.id = o.service_id`;

  const [orders, matched, counts, unpaid, revenue] = await Promise.all([
    sql.query(
      `select o.*, v.name as service, v.price_from as service_price ${from} ${where}
       order by o.created_at desc limit 100`,
      values,
    ),
    sql.query(`select count(*)::int as n ${from} ${where}`, values),
    sql`select status, count(*)::int as n from orders group by status`,
    sql`select count(*)::int as n from orders where price is not null and not paid and status <> 'batal'`,
    sql`select coalesce(sum(price), 0)::int as total from orders where paid`,
  ]);

  const count = (st: string) => Number(counts.find((c) => c.status === st)?.n ?? 0);
  const total = counts.reduce((sum, c) => sum + Number(c.n), 0);
  const unpaidCount = Number(unpaid[0]?.n ?? 0);
  const paidTotal = Number(revenue[0]?.total ?? 0);
  const resultCount = Number(matched[0]?.n ?? 0);

  const keepSearch = (path: string) =>
    q ? `${path}${path.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}` : path;
  const clearSearch = filter
    ? `/admin?s=${filter}`
    : unpaidOnly
      ? "/admin?p=belum"
      : "/admin";

  return (
    <AdminShell active="orders">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">Pesanan</h1>
          <p className="mt-2 text-sm text-mute">Kelola brief, harga, status, dan pembayaran.</p>
        </div>
        <p className="text-sm text-mute">
          Lunas terkumpul <span className="ml-1 font-semibold tabular-nums text-ink">{rupiah(paidTotal)}</span>
        </p>
      </div>

      {(saved || deleted) && (
        <div role="status" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-tag-sm border border-ink/15 bg-ink/[0.06] px-4 py-3 text-sm">
          <span>{deleted ? `Pesanan ${deleted} sudah dihapus.` : "Perubahan pesanan tersimpan."}</span>
          <Link href={returnTo} className="font-semibold text-mute transition-colors hover:text-ink">
            Tutup
          </Link>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Baru" value={count("menunggu")} hint="menunggu konfirmasi" href={keepSearch("/admin?s=menunggu")} />
        <Stat label="Dikerjakan" value={count("dikerjakan") + count("revisi")} hint="termasuk revisi" />
        <Stat label="Selesai" value={count("selesai")} hint="total pesanan selesai" />
        <Stat label="Belum dibayar" value={unpaidCount} hint="harga sudah disepakati" href={keepSearch("/admin?p=belum")} />
      </div>

      <form action="/admin" method="get" className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
        {filter && <input type="hidden" name="s" value={filter} />}
        {unpaidOnly && <input type="hidden" name="p" value="belum" />}
        <label htmlFor="cari-pesanan" className="sr-only">Cari pesanan</label>
        <input
          id="cari-pesanan"
          name="q"
          defaultValue={q}
          placeholder="Cari kode, nama, atau WhatsApp…"
          className="field min-h-10 sm:max-w-sm"
          autoComplete="off"
        />
        <button type="submit" className="btn-outline min-h-10 px-4 text-sm">Cari</button>
        {q && (
          <Link href={clearSearch} className="btn-ghost min-h-10 px-4 text-sm">
            Hapus pencarian
          </Link>
        )}
      </form>

      <nav aria-label="Filter pesanan" className="mt-4 flex flex-wrap gap-2">
        <FilterLink href={keepSearch("/admin")} active={!filter && !unpaidOnly}>
          Semua ({total})
        </FilterLink>
        {STATUSES.map((st) => (
          <FilterLink key={st} href={keepSearch(`/admin?s=${st}`)} active={filter === st}>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="status-dot" style={{ background: STATUS_META[st].color }} />
              {STATUS_META[st].label} ({count(st)})
            </span>
          </FilterLink>
        ))}
        <FilterLink href={keepSearch("/admin?p=belum")} active={unpaidOnly}>
          Belum dibayar ({unpaidCount})
        </FilterLink>
      </nav>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2 text-sm text-mute">
        <p>
          {resultCount === 0
            ? "Tidak ada pesanan yang cocok."
            : `Menampilkan ${orders.length} dari ${resultCount} pesanan${q ? ` untuk “${q}”` : ""}.`}
        </p>
        {resultCount > orders.length && <p className="text-xs">Batasi pencarian untuk melihat sisanya.</p>}
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 rounded-tag-lg border border-dashed border-line p-8 text-center">
          <p className="font-semibold">
            {q
              ? `Tidak ada pesanan untuk “${q}”.`
              : unpaidOnly
                ? "Semua pesanan berharga sudah dibayar."
                : filter
                  ? "Belum ada pesanan dengan status ini."
                  : "Belum ada pesanan."}
          </p>
          <p className="mt-2 text-sm text-mute">
            {q
              ? "Coba kata kunci lain, atau hapus pencarian untuk melihat semua pesanan."
              : "Bagikan halaman /order ke calon klien untuk mulai menerima pesanan."}
          </p>
          {q ? (
            <Link href={clearSearch} className="btn-outline mt-5 min-h-10 px-4 text-sm">
              Hapus pencarian
            </Link>
          ) : (
            <Link href="/order" className="btn-outline mt-5 min-h-10 px-4 text-sm">
              Buka halaman pesan
            </Link>
          )}
        </div>
      ) : (
        <ul className="mt-4 border-t border-line">
          {orders.map((o) => {
            const st = (isStatus(o.status) ? o.status : "menunggu") as Status;
            const price = o.price == null ? null : Number(o.price);
            return (
              <li key={o.id} className="border-b border-line">
                <details className="group" open={o.code === openCode}>
                  <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-1 py-5 transition-colors hover:bg-sand/50 sm:grid-cols-[7rem_minmax(0,1.2fr)_minmax(0,.85fr)_10rem_7rem_1.25rem] sm:gap-4 sm:px-3">
                    <span className="font-mono text-[13px] font-semibold tracking-wide">{o.code}</span>
                    <span className="flex items-center gap-2 justify-self-end sm:hidden">
                      <StatusBadge color={STATUS_META[st].color} label={STATUS_META[st].label} />
                      <span aria-hidden className="text-ink/30 transition-transform group-open:rotate-90">→</span>
                    </span>

                    <span className="col-span-2 min-w-0 sm:col-span-1">
                      <span className="block truncate font-semibold">{o.name}</span>
                      <span className="block text-xs text-mute sm:hidden">
                        {o.service ?? "—"} · {tanggal(o.created_at)}
                      </span>
                    </span>

                    <span className="hidden text-sm text-mute sm:block">{o.service ?? "—"}</span>
                    <span className="hidden sm:block">
                      <StatusBadge color={STATUS_META[st].color} label={STATUS_META[st].label} />
                    </span>

                    <span className="col-span-2 flex items-center justify-between gap-3 border-t border-line/70 pt-2 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
                      <span className="text-xs text-mute sm:hidden">Total</span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold tabular-nums">{price ? rupiah(price) : "—"}</span>
                        <span className={`block text-xs ${o.paid ? "font-medium text-ink/60" : "text-mute"} sm:hidden`}>
                          {o.paid ? "Lunas" : price ? "Belum dibayar" : "Tanpa harga"}
                        </span>
                      </span>
                    </span>

                    <span className="hidden text-right text-xs text-mute sm:block">{tanggal(o.created_at)}</span>
                    <span aria-hidden className="hidden text-ink/30 transition-transform group-open:rotate-90 sm:block">→</span>
                  </summary>

                  <div className="grid gap-8 border-t border-line bg-panel/40 px-1 pb-7 pt-6 sm:px-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-5">
                      <div>
                        <p className="eyebrow">Brief</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{o.brief}</p>
                      </div>

                      <dl className="grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
                        <div>
                          <dt className="text-mute">WhatsApp</dt>
                          <dd className="mt-1">
                            <a
                              href={`https://wa.me/${o.wa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                            >
                              {o.wa}
                            </a>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mute">Target selesai</dt>
                          <dd className="mt-1 font-medium">{o.deadline ? tanggal(o.deadline) : "Fleksibel"}</dd>
                        </div>
                        <div>
                          <dt className="text-mute">Referensi</dt>
                          <dd className="mt-1 font-medium">
                            {o.ref_link ? (
                              <a href={o.ref_link} target="_blank" rel="noreferrer" className="underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                                Buka link
                              </a>
                            ) : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-mute">Dibuat</dt>
                          <dd className="mt-1 font-medium">{tanggal(o.created_at)}</dd>
                        </div>
                      </dl>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a href={`https://wa.me/${o.wa}`} target="_blank" rel="noreferrer" className="btn-outline min-h-10 px-4 text-sm">
                          Chat klien <span aria-hidden="true">→</span>
                        </a>
                        <Link href={`/lacak/${o.code}`} className="btn-ghost min-h-10 px-4 text-sm">
                          Lihat halaman klien
                        </Link>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <OrderEditor
                        order={{ id: Number(o.id), status: o.status, price, note: o.note, paid: Boolean(o.paid) }}
                        servicePrice={o.service_price == null ? null : Number(o.service_price)}
                        returnTo={returnTo}
                      />

                      <div className="rounded-tag-lg border border-[#c0392b]/25 bg-[#c0392b]/[0.04] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e98078]">Hapus pesanan</p>
                        <p className="mt-2 text-xs leading-5 text-mute">
                          Untuk pesanan duplikat, uji coba, atau yang sudah dibatalkan. Riwayat status ikut terhapus.
                        </p>
                        <div className="mt-4">
                          <DeleteOrderButton
                            id={Number(o.id)}
                            code={o.code}
                            name={o.name}
                            returnTo={returnTo}
                          />
                        </div>
                      </div>
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

function Stat({ label, value, hint, href }: { label: string; value: number; hint: string; href?: string }) {
  const body = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/60">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </>
  );
  const className = "block rounded-tag-lg border border-line bg-panel/50 p-4 transition-colors sm:p-5";
  return href ? (
    <Link href={href} className={`${className} hover:border-ink/40`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 items-center rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${
        active ? "border-ink bg-ink text-paper" : "border-line text-ink/60 hover:border-ink/40 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
