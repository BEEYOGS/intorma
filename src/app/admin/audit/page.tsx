import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { CopyTextButton } from "@/components/CopyTextButton";
import { isAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { tanggal } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log aktivitas", robots: { index: false } };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!(await isAdmin())) redirect("/admin/login");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (q) {
    values.push(`%${q}%`);
    const p = `$${values.length}`;
    conditions.push(`(action ilike ${p} or entity ilike ${p} or entity_id ilike ${p} or actor ilike ${p})`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const [rows, countRows] = await Promise.all([
    sql.query(
      `select id, actor, action, entity, entity_id, meta, created_at
       from audit_log ${where}
       order by created_at desc
       limit ${pageSize} offset ${offset}`,
      values,
    ),
    sql.query(`select count(*)::int as n from audit_log ${where}`, values),
  ]);

  const total = Number(countRows[0]?.n ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const serialize = (value: unknown) =>
    JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item), 2);
  const pageJson = serialize(rows);

  return (
    <AdminShell active="audit">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Audit</p>
          <h1 className="display mt-4 text-4xl sm:text-5xl">Log aktivitas</h1>
          <p className="mt-2 text-sm text-mute">Riwayat aksi admin: pesanan, layanan, pengaturan, pembayaran.</p>
        </div>
        <form action="/admin/audit" method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Cari aksi, entitas, kode…"
            className="field min-h-10 sm:max-w-xs"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-outline min-h-10 px-4 text-sm">Cari</button>
        </form>
        {rows.length > 0 && (
          <CopyTextButton value={pageJson} label="Salin JSON halaman ini" className="sm:ml-auto" />
        )}
      </div>

      <div className="mt-6 text-sm text-mute">
        {total === 0 ? "Belum ada log." : `Menampilkan ${rows.length} dari ${total} entri (halaman ${page} dari ${totalPages}).`}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-tag-lg border border-dashed border-line p-8 text-center">
          <p className="font-semibold">Tidak ada log aktivitas.</p>
          <p className="mt-2 text-sm text-mute">Aksi admin akan muncul di sini setelah dilakukan.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-tag-lg border border-line">
          <table className="w-full text-sm">
            <thead className="bg-panel/60 text-xs uppercase tracking-[0.14em] text-mute">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Waktu</th>
                <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                <th className="px-4 py-3 text-left font-semibold">Entitas</th>
                <th className="px-4 py-3 text-left font-semibold">ID</th>
                <th className="px-4 py-3 text-left font-semibold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={String(r.id)} className="align-top">
                  <td className="px-4 py-3 text-xs text-mute whitespace-nowrap">{tanggal(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-tag-sm border border-line bg-panel px-2 py-1 text-xs font-semibold">
                      {String(r.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{String(r.entity)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.entity_id ? String(r.entity_id) : "—"}</td>
                  <td className="px-4 py-3 text-xs text-mute">
                    {r.meta ? (
                      <div className="flex items-start justify-between gap-2">
                        <pre className="min-w-0 whitespace-pre-wrap break-all font-mono text-xs">{serialize(r.meta)}</pre>
                        <CopyTextButton value={serialize(r.meta)} label={`Salin detail log ${String(r.id)}`} className="shrink-0" />
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Halaman audit">
          {page > 1 && (
            <a href={`/admin/audit?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="btn btn-outline min-h-12 px-4 text-sm sm:min-h-10">
              Sebelumnya
            </a>
          )}
          <span className="text-xs text-mute">Halaman {page} dari {totalPages}</span>
          {page < totalPages && (
            <a href={`/admin/audit?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="btn btn-outline min-h-12 px-4 text-sm sm:min-h-10">
              Berikutnya
            </a>
          )}
        </nav>
      )}
    </AdminShell>
  );
}